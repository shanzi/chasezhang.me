isNumber: (x) ->
    # tool function
    # to test if x in a number
    typeof x is typeof 1 and x!=null and isFinite(x)

class Point
    constructor: (x,y,z) ->
        @x=x
        @y=y
        @z=z

class Vec3
    constructor: (a,b,c) ->
        if a instanceof Point
            if b instanceof Point
                @x=b.x-a.x
                @y=b.y-a.y
                @z=b.z-a.z
            else
                @x=a.x
                @y=b.x
                @z=c.x
        else if a instanceof Vec3
            @x=a.x
            @y=a.y
            @c=a.z
        else if isNumber(a) and isNumber(b) and isNumber(c)
            @x=a
            @y=b
            @z=c
        else
            throw new TypeError("could not constract Vec3 with arguments of '#{typeof a}' , '#{typeof b}' and '#{typeof c}")

        dot:(b) ->
            # dot product 
            @x * b.x + @y*b.y + @z*b.z

        cross:(b) ->
            # cross product 
            return Vec3(
                @y*b.z-@y*b.x,
                -@x*b.z-@z*b.x,
                @x*b.y-@y*b.x
            )


class Style
    @fillStyle="" # color
    @strokeStyle="black" # color
    @lineWidth="" # float
    @lineCap="" # string [round,butt,square]
    @lineJoin="" # string [round,bevel,miter]

    _pstyle:(r,g,b,a) ->
        if typeof(r) is "String"  and  r.match(/#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}/)
            return r
        else if typeof r is "number" and not a
            "rgb(#{r},#{g},#{b})"
        else
            "rgba(#{r},#{g},#{b},#{a})"

    fillStyle:(r,g,b,a) ->
        @fillStyle = this._pstyle(r,g,b,a)

    @strokeStyle:(r,g,b,a) ->
        @strokeStyle = this._pstyle(r,g,b,a)


class Shape
    constructor: (points) ->
        if points and points.length>=3
            v1=new Vec3(points[0],points[1])
            v2=new Vec3(points[0],points[2])
            @points = points
            @norm = v1.cross(v2)
        else
            throw new TypeError("argument points must be a list with more than 3 points")

    at: (pos) ->
        return @points[pos]

    first: ->
        if @points.length
            return @points[0]
        else
            return null

    last: ->
        if @points.length
            return @points[@points.length-1]
        else
            return null

    iterator: ->
        cur=0
        return ->
            if cur<@points.length
                point = @points[cur]
                cur+=1
                return points
            else
                return null
             
    riterator: ->
        cur=@points.length-1
        return ->
            if cur>0
                point =@point[cur]
                cur-=1
                return point
            else
                return null

    style: (style) ->
        if style instanceof Style
            @style = style
        else
            throw TypeError("argument 'style' must be an instance of Style")

class Scene
    constructor: (id) ->
        @canvas = document.getElementById(id)
        if @canvas.getContext
            @ctx = getContext "2d"
            @curves = []
        else
            throw new Error("Can not get 2d context, browser do not support html5 canvas")

    addShape: (shape) ->
        if shape instanceof Shape
            @curves.push shape 
        else
            throw new TypeError("argument 'shape' must be an instance of Shape")

