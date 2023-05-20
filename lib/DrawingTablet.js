class DrawingTablet {
  #canvas = document.createElement("canvas");
  #ctx = this.#canvas.getContext("2d");

  #CONSTANTS = {
    DATA_KEY: "paths",
  };

  #isDrawing = false;
  #paths = [];
  #rzTimeout;
  #redo = [];

  #opts = {
    width: 600,
    height: 600,
    size: undefined,
    bg: "#167e60",
    color: "#000000",
    brushSize: 2,
    logs: false,
    fullSize: false,
    fullWidth: false,
    fullHeight: false,
    fullscreen: false,
    lineCap: "round",
    lineJoin: "round",
    overflow: "hidden",
    scale: 1,
    autosave: true,
  };

  constructor(element, opts) {
    this.#opts = { ...this.#opts, ...opts };

    this.#initializeContainer(element);
    this.#initializeOptions();
    this.#initializeCanvas();
    this.drawFromSaved();
    this.#canvas.addEventListener("mousedown", this.#handleStart);
    this.#canvas.addEventListener("mousemove", this.#handleMove);
    document.addEventListener("mouseup", this.#handleEnd);

    this.#canvas.addEventListener("touchstart", this.#handleStart);
    this.#canvas.addEventListener("touchmove", this.#handleMove);
    document.addEventListener("touchend", this.#handleEnd);

    document.addEventListener("keydown", this.#handleKeypress);

    window.addEventListener("resize", this.#handleResize);
    this.#log("Events initialized");
  }

  #handleKeypress = (e) => {
    if (e.ctrlKey && e.code === "KeyZ") {
      this.undo();
    }
    if (e.ctrlKey && e.code === "KeyY") {
      this.redo();
    }
    if (e.ctrlKey && e.code === "KeyS") {
      e.preventDefault();
      this.save();
    }

    if (e.ctrlKey && e.code === "KeyE") {
      e.preventDefault();
      this.download();
    }
  };

  #getBrush() {
    return {
      color: this.#opts.color,
      bg: this.#opts.bg,
      brushSize: this.#opts.brushSize,
      lineCap: this.#opts.lineCap,
      lineJoin: this.#opts.lineJoin,
    };
  }

  #handleStart = (e) => {
    e.preventDefault();
    if (e.which == 1 || e.which == 0 || e.touches) {
      this.#log("Drawing Started");
      this.#isDrawing = true;
      this.#paths.push([[...this.#coordinates(e), this.#getBrush()]]);
      this.#draw();
    }
  };

  #handleMove = (e) => {
    e.preventDefault();
    const coords = this.#coordinates(e);
    if (this.#isDrawing) {
      this.#paths[this.#paths.length - 1].push(coords);
      this.#draw();
    }
  };

  #handleEnd = () => {
    if (this.#isDrawing) {
      this.#log("Drawing End");
      if (this.#opts.autosave) {
        this.save();
        this.#log("Auto Saved");
      }
    }
    this.#isDrawing = false;
  };

  #handleResize = () => {
    if (this.#rzTimeout) {
      window.clearTimeout(this.#rzTimeout);
      this.#rzTimeout = null;
    }
    this.#rzTimeout = setTimeout(() => {
      const { width: elWidth, height: elHeight } =
        this.container.getBoundingClientRect();
      if (this.#opts.fullscreen) {
        this.#opts.width = window.innerWidth;
        this.#opts.height = window.innerHeight;
      } else if (this.#opts.fullSize) {
        this.#opts.width = elWidth;
        this.#opts.height = elHeight;
      } else if (this.#opts.fullWidth) {
        this.#opts.width = elWidth;
      } else if (this.#opts.fullHeight) {
        this.#opts.height = elHeight;
      }
      this.#initializeCanvasSize();
      this.#draw();
    }, 200);
  };

  #initializeContainer(element) {
    this.container = document.body;
    if (element) {
      if (typeof element === "string") {
        this.container = document.querySelector(element);
        if (!this.container) {
          throw new Error("Element not found. Please check your selector.");
        }
      } else if (element.tagName) {
        this.container = element;
      } else {
        console.error("Invalid element");
      }
    }
    this.container.style.overflow = this.#opts.overflow;
    this.#log("Container Initialized");
  }

  #initializeOptions() {
    if (this.#opts.size) {
      this.#opts.width = this.#opts.size;
      this.#opts.height = this.#opts.size;
    }
    if (this.#opts.fullscreen) {
      this.#opts.width = window.innerWidth;
      this.#opts.height = window.innerHeight;
    }
    const { width: elWidth, height: elHeight } =
      this.container.getBoundingClientRect();
    if (this.#opts.fullSize) {
      this.#opts.width = elWidth;
      this.#opts.height = elHeight;
    }
    if (this.#opts.fullWidth) {
      this.#opts.width = elWidth;
    }
    if (this.#opts.fullHeight) {
      this.#opts.height = elHeight;
    }
  }

  #initializeCanvas() {
    this.#initializeCanvasSize();
    this.#canvas.style.background = this.#opts.bg;
    this.container.appendChild(this.#canvas);
    this.#log("Canvas initialized");
  }

  #initializeCanvasSize() {
    this.#canvas.width = this.#opts.width;
    this.#canvas.height = this.#opts.height;
  }

  #coordinates(e) {
    if (e.touches && e.touches.length > 0) {
      return [
        e.touches[0].clientX - this.#canvas.offsetLeft,
        e.touches[0].clientY - this.#canvas.offsetTop,
      ];
    }
    return [
      e.clientX - this.#canvas.offsetLeft,
      e.clientY - this.#canvas.offsetTop,
    ];
  }

  #draw() {
    this.clearOnlyScreen();
    this.#drawPath();
  }

  #drawPath() {
    for (let i = 0; i < this.#paths.length; i++) {
      const line = this.#paths[i];
      const startPath = line[0];
      this.#ctx.lineWidth = startPath[2].brushSize;
      this.#ctx.strokeStyle = startPath[2].color;
      this.#ctx.beginPath();
      this.#ctx.moveTo(...startPath);
      for (let j = 0; j < line.length; j++) {
        this.#ctx.lineTo(line[j][0], line[j][1]);
      }
      this.#ctx.lineCap = startPath[2].lineCap;
      this.#ctx.lineJoin = startPath[2].lineJoin;
      this.#ctx.stroke();
    }
  }

  #log(message, opts) {
    const o = {
      icon: true,
      color: "#0cc0e4",
      disableColor: false,
      logs: this.#opts.logs,
      ...opts,
    };

    if (o.logs) {
      if (typeof message !== "string") {
        console.log(message);
        return;
      }
      if (o.icon) {
        message = `ⓘ ${message}`;
      }
      if (!o.disableColor) {
        message = `%c${message}`;
      }
      console.log(message, `color: ${o.color}`);
    }
  }

  log(message) {
    return this.#log(message, { color: "yellow", logs: true });
  }

  set bg(color) {
    this.#opts.bg = color;
    this.#canvas.style.background = this.#opts.bg;
  }

  set brushSize(size) {
    this.#opts.brushSize = size;
  }

  get brushSize() {
    return this.#opts.brushSize;
  }

  set brushColor(color) {
    this.#opts.color = color;
  }

  get brushColor() {
    return this.#opts.color;
  }

  get opts() {
    return { ...this.#opts };
  }

  get ctx() {
    return this.#ctx;
  }

  get canvas() {
    return this.#canvas;
  }

  redraw() {
    this.#draw();
  }

  clearOnlyScreen() {
    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
  }

  clear() {
    this.clearOnlyScreen();
    this.#paths = [];
    this.clearSaved();
    this.#isDrawing = false;
    this.#log("Cleared");
  }

  undo() {
    if (this.#paths.length > 0) {
      this.#redo.push({
        type: "path",
        data: this.#paths[this.#paths.length - 1],
      });
      this.#paths.pop();
      this.redraw();
      this.#log("Undo Called");
    }
  }

  redo() {
    const redoObj = this.#redo[this.#redo.length - 1];
    if (redoObj && redoObj.type == "path") {
      this.#paths.push(redoObj.data);
      this.redraw();
      this.#redo.pop();
      this.#log("Redo Called");
    }
  }

  save() {
    localStorage.removeItem(this.#CONSTANTS.DATA_KEY);
    localStorage.setItem(this.#CONSTANTS.DATA_KEY, JSON.stringify(this.#paths));
  }

  clearSaved() {
    localStorage.removeItem(this.#CONSTANTS.DATA_KEY);
  }

  drawFromSaved() {
    const paths = localStorage.getItem(this.#CONSTANTS.DATA_KEY);
    if (paths) {
      this.#paths = JSON.parse(paths);
      this.redraw();
    }
  }

  download(filename = "drawing") {
    this.#ctx.fillStyle = this.#opts.bg;
    this.#ctx.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
    this.#drawPath();
    const a = document.createElement("a");
    a.download = filename;
    a.style.display = "none";
    const dataUrl = this.#canvas.toDataURL();
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
