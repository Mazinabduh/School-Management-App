/* =========================================================
   login-bg.js — خلفية Canvas متحركة لشاشة الدخول
   نفس محرك تطبيق المحطة: جزيئات متصاعة وخطوط ربط زرقاء
========================================================= */
"use strict";

const LoginBG = {
  canvas: null,
  ctx: null,
  particles: [],
  raf: null,

  init(id){
    this.canvas = document.getElementById(id);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this._resize();
    window.addEventListener("resize", () => this._resize());
    this.particles = [];
    for (let i = 0; i < 22; i++) this.particles.push({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      r: 1 + Math.random() * 2.5,
      vx: (Math.random() - .5) * .4,
      vy: -.2 - Math.random() * .5,
      a: .15 + Math.random() * .5,
      c: Math.random() > .5 ? "0,180,255" : "0,255,136"
    });
    this._loop();
  },

  _resize(){
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  _loop(){
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const ps = this.particles;
    for (let i = 0; i < ps.length; i++){
      for (let j = i + 1; j < ps.length; j++){
        const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 130){
          this.ctx.beginPath();
          this.ctx.moveTo(ps[i].x, ps[i].y);
          this.ctx.lineTo(ps[j].x, ps[j].y);
          this.ctx.strokeStyle = "rgba(0,180,255," + (.06 * (1 - d / 130)).toFixed(3) + ")";
          this.ctx.lineWidth = .5;
          this.ctx.stroke();
        }
      }
    }
    ps.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      this.ctx.fillStyle = "rgba(" + p.c + "," + (p.a * .12).toFixed(3) + ")";
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fillStyle = "rgba(" + p.c + "," + p.a.toFixed(3) + ")";
      this.ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.y < -10){ p.y = this.canvas.height + 10; p.x = Math.random() * this.canvas.width; }
      if (p.x < -10 || p.x > this.canvas.width + 10) p.vx *= -1;
    });
    this.raf = requestAnimationFrame(() => this._loop());
  },

  stop(){
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }
};

window.LoginBG = LoginBG;
