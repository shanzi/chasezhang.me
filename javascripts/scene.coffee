#################################################################################
#     File Name           :     scene.coffee
#     Created By          :     shanzi
#     Creation Date       :     [2013-04-05 00:50]
#     Last Modified       :     [2013-04-05 01:07]
#     Description         :     Display face 3d object in 2d canvas element 
#################################################################################


class Vec3
    # Vector in 3D along with some useful operate functions
    constructor: (x,y,z) ->
        @x=x
        @y=y
        @z=z

    dot:(b) ->
        # dot product 
        @x * b.x + @y*b.y + @z*b.z

    cross:(b) ->
        # cross product 
        return Vec3(
            @y*b.z-@y*b.x,
            @z*b.x-@x*b.z,
            @x*b.y-@y*b.x
        )

    move:(x,y,z) ->
        @x+=x
        @y+=y
        @z+=z

    rot:(a,b) ->
        cosa=Math.cos(a)
        sina=Math.sin(a)
        cosb=Math.cos(b)
        sinb=Math.sin(b)
        xsza=@x*sina+@z*cosa
        return Vec3(
            @x*cosa-@z*sina,
            @y*cosb-sinb*xsza,
            @y*sinb+cosb*xsza
        )


class Style

    @fillStyle   = "#fff" # color
    @strokeStyle = "#000" # color
    @lineWidth   = ""     # float
    @lineCap     = ""     # string [round,butt,square]
    @lineJoin    = ""     # string [round,bevel,miter]

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
            v1      = new Vec3(points[0],points[1])
            v2      = new Vec3(points[0],points[2])
            @points = points
            @norm   = v1.cross(v2)
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
    # the scene to handle all shapes to display
    constructor: (id) ->
        @canvas = document.getElementById(id)
        if @canvas.getContext
            @ctx    = getContext "2d"
            @zvec   = new Vec3(0,0,1) # a constant vec denoted the direction of camara
            @tvec   = new Vec3(0,0,0) # a vec to translate the whole scene
            @shapes = []
            @rota   = 0               # global scene rotation around y axis
            @rotb   = 0               # global scene rotation around x axis
        else
            throw new Error("Can not get 2d context, browser do not support html5 canvas")

    addShape: (shape) ->
        if shape instanceof Shape
            @shapes.push shape
        else
            throw new TypeError("argument 'shape' must be an instance of Shape")

    render: ->
        for shape in @shapes
            # draw every shape    
            if shape.norm.dot(@zvec)>0
                shape.draw(@ctx)

