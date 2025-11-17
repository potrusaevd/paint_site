class ClickSpark {
    constructor(container = document.body, options = {}) {
        console.log('ClickSpark constructor called'); // отладка
        
        this.container = container;
        this.sparkColor = options.sparkColor || "#fff";
        this.sparkSize = options.sparkSize || 10;
        this.sparkRadius = options.sparkRadius || 15;
        this.sparkCount = options.sparkCount || 8;
        this.duration = options.duration || 400;
        this.easing = options.easing || "ease-out";
        this.extraScale = options.extraScale || 1.0;

        this.sparks = [];
        this.startTime = null;

        this.canvas = document.createElement("canvas");
        this.canvas.classList.add("click-spark-canvas");
        this.canvas.style.pointerEvents = "none"; // важно: canvas не должен блокировать клики
        this.canvas.style.zIndex = "9999";
        this.ctx = this.canvas.getContext("2d");

        // Проверяем, что контейнер существует
        if (!this.container) {
            console.error('Container not found');
            return;
        }

        // Устанавливаем позицию контейнера
        const containerStyle = getComputedStyle(this.container);
        if (containerStyle.position === 'static') {
            this.container.style.position = "relative";
        }
        
        this.container.appendChild(this.canvas);

        this.resizeCanvas();
        window.addEventListener("resize", () => this.resizeCanvas());

        // Добавляем обработчик клика с отладкой
        this.container.addEventListener("click", (e) => {
            console.log('Click detected:', e.clientX, e.clientY); // отладка
            this.handleClick(e);
        });

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
        
        console.log('ClickSpark initialized successfully'); // отладка
    }

    resizeCanvas() {
        if (this.container === document.body) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.canvas.style.position = "fixed";
            this.canvas.style.top = "0";
            this.canvas.style.left = "0";
        } else {
            const rect = this.container.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            this.canvas.style.position = "absolute";
            this.canvas.style.top = "0";
            this.canvas.style.left = "0";
        }
    }

    easeFunc(t) {
        switch (this.easing) {
            case "linear":
                return t;
            case "ease-in":
                return t * t;
            case "ease-in-out":
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            default:
                return t * (2 - t);
        }
    }

    handleClick(e) {
        console.log('handleClick called'); // отладка
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const now = performance.now();

        console.log('Spark position:', x, y); // отладка

        for (let i = 0; i < this.sparkCount; i++) {
            this.sparks.push({
                x,
                y,
                angle: (2 * Math.PI * i) / this.sparkCount,
                startTime: now,
            });
        }
        
        console.log('Sparks added:', this.sparks.length); // отладка
    }

    animate(timestamp) {
        if (!this.startTime) this.startTime = timestamp;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.sparks = this.sparks.filter((spark) => {
            const elapsed = timestamp - spark.startTime;
            if (elapsed >= this.duration) return false;

            const progress = elapsed / this.duration;
            const eased = this.easeFunc(progress);
            const distance = eased * this.sparkRadius * this.extraScale;
            const lineLength = this.sparkSize * (1 - eased);

            const x1 = spark.x + distance * Math.cos(spark.angle);
            const y1 = spark.y + distance * Math.sin(spark.angle);
            const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
            const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

            ctx.strokeStyle = this.sparkColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            return true;
        });

        requestAnimationFrame(this.animate);
    }
}