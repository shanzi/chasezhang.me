// Generated by CoffeeScript 1.6.2
(function() {
  var Point, Scene, Shape, Style, Vec3;

  ({
    isNumber: function(x) {
      return typeof x === typeof 1 && x !== null && isFinite(x);
    }
  });

  Point = (function() {
    function Point(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
    }

    return Point;

  })();

  Vec3 = (function() {
    function Vec3(a, b, c) {
      if (a instanceof Point) {
        if (b instanceof Point) {
          this.x = b.x - a.x;
          this.y = b.y - a.y;
          this.z = b.z - a.z;
        } else {
          this.x = a.x;
          this.y = b.x;
          this.z = c.x;
        }
      } else if (a instanceof Vec3) {
        this.x = a.x;
        this.y = a.y;
        this.c = a.z;
      } else if (isNumber(a) && isNumber(b) && isNumber(c)) {
        this.x = a;
        this.y = b;
        this.z = c;
      } else {
        throw new TypeError("could not constract Vec3 with arguments of '" + (typeof a) + "' , '" + (typeof b) + "' and '" + (typeof c));
      }
      ({
        dot: function(b) {
          return this.x * b.x + this.y * b.y + this.z * b.z;
        },
        cross: function(b) {
          return Vec3(this.y * b.z - this.y * b.x, -this.x * b.z - this.z * b.x, this.x * b.y - this.y * b.x);
        }
      });
    }

    return Vec3;

  })();

  Style = (function() {
    function Style() {}

    Style.fillStyle = "";

    Style.strokeStyle = "black";

    Style.lineWidth = "";

    Style.lineCap = "";

    Style.lineJoin = "";

    Style.prototype._pstyle = function(r, g, b, a) {
      if (typeof r === "String" && r.match(/#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}/)) {
        return r;
      } else if (typeof r === "number" && !a) {
        return "rgb(" + r + "," + g + "," + b + ")";
      } else {
        return "rgba(" + r + "," + g + "," + b + "," + a + ")";
      }
    };

    Style.prototype.fillStyle = function(r, g, b, a) {
      return this.fillStyle = this._pstyle(r, g, b, a);
    };

    Style.strokeStyle = function(r, g, b, a) {
      return this.strokeStyle = this._pstyle(r, g, b, a);
    };

    return Style;

  })();

  Shape = (function() {
    function Shape(points) {
      var v1, v2;

      if (points && points.length >= 3) {
        v1 = new Vec3(points[0], points[1]);
        v2 = new Vec3(points[0], points[2]);
        this.points = points;
        this.norm = v1.cross(v2);
      } else {
        throw new TypeError("argument points must be a list with more than 3 points");
      }
    }

    Shape.prototype.at = function(pos) {
      return this.points[pos];
    };

    Shape.prototype.first = function() {
      if (this.points.length) {
        return this.points[0];
      } else {
        return null;
      }
    };

    Shape.prototype.last = function() {
      if (this.points.length) {
        return this.points[this.points.length - 1];
      } else {
        return null;
      }
    };

    Shape.prototype.iterator = function() {
      var cur;

      cur = 0;
      return function() {
        var point;

        if (cur < this.points.length) {
          point = this.points[cur];
          cur += 1;
          return points;
        } else {
          return null;
        }
      };
    };

    Shape.prototype.riterator = function() {
      var cur;

      cur = this.points.length - 1;
      return function() {
        var point;

        if (cur > 0) {
          point = this.point[cur];
          cur -= 1;
          return point;
        } else {
          return null;
        }
      };
    };

    Shape.prototype.style = function(style) {
      if (style instanceof Style) {
        return this.style = style;
      } else {
        throw TypeError("argument 'style' must be an instance of Style");
      }
    };

    return Shape;

  })();

  Scene = (function() {
    function Scene(id) {
      this.canvas = document.getElementById(id);
      if (this.canvas.getContext) {
        this.ctx = getContext("2d");
        this.curves = [];
      } else {
        throw new Error("Can not get 2d context, browser do not support html5 canvas");
      }
    }

    Scene.prototype.addShape = function(shape) {
      if (shape instanceof Shape) {
        return this.curves.push(shape);
      } else {
        throw new TypeError("argument 'shape' must be an instance of Shape");
      }
    };

    return Scene;

  })();

}).call(this);

/*
//@ sourceMappingURL=scene.map
*/