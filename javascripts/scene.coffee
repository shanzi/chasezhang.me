class Point
    constructor: (x,y,z) ->
        @x=x
        @y=y
        @z=z

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


class Curve
    constructor: (points) ->
        @points=points ? []
        @cursor=0

    get: (cur) ->
        if cur and cur < @points.length
            @points[cur]
        else
            @points[this.cursor]
    
    next: ->
        if @cursor < @points.length and @cursor >= 0
            @points[@cursor]
        else
            null

    cursor: (cur) ->
        if cur and cur < @points.length and cur >= 0
            @cursor = cur
        @cursor

    end: ->
        @cursor = @points.length

    rewind: ->
        @cursor = 0

    length: ->
        @points.length

    first: ->
        @points[0]

    last: ->
        @points[@points.length-1]

    style: (style) ->
        if style instanceof Style
            @style = style
        else
            throw "Type Error: argument 'style' must be an instance of Style"

class Scene
    constructor: (id) ->
        @canvas = document.getElementById(id)
        if @canvas.getContext
            @ctx = getContext "2d"
            @curves = []
        else
            throw "Can not get context, browser do not support html5 canvas"

    addCurve: (curve) ->
        if curve instanceof Curve
            @curves.push curve
        else
            throw "Type Error argument 'curve' must be an instance of Curve"

    drawCurve: (curve) ->
        # draw a curve here
        curve

    render: ->
        for curve in @curves
            this.drawCurve curve

