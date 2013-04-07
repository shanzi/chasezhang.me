#################################################################################
#     File Name           :     scene.coffee
#     Created By          :     shanzi
#     Creation Date       :     [2013-04-05 00:50]
#     Last Modified       :     [2013-04-07 21:50]
#     Description         :     Display fake 3d object in 2d canvas element 
#################################################################################

class Vec2
    constructor: (@x,@y) ->

    to:(b) ->
        new Vec3( b.x-@x, b.y-@y)

class Vec3
    # Vetor in 3D along with some useful operate functions
    constructor: (@x,@y,@z) ->


    to:(b) ->
        new Vec3( b.x-@x, b.y-@y, b.z-@z)

    dot:(b) ->
        # dot product 
        @x * b.x + @y*b.y + @z*b.z

    cross:(b) ->
        # cross product 
        return new Vec3(
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
        return new Vec3(
            @x*cosa-@z*sina,
            @y*cosb-sinb*xsza,
            @y*sinb+cosb*xsza
        )

    distance: (v) ->
        # the length of vector (this - v)
        dx=(@x-v.x)
        dy=(@y-v.y)
        dz=(@z-v.z)
        Math.sqrt(dx*dx+dy*dy+dz*dz)


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
            @points = points
        else
            throw new TypeError("argument points must be a list with more than 3 points")


class Scene
    # the scene to handle all shapes to display
    constructor: (id) ->
        @canvas = document.getElementById(id)
        if @canvas.getContext
            @ctx    = @canvas.getContext "2d"

            @w      = @canvas.width/2
            @h      = @canvas.height/2

            @zvec   = new Vec3(0,0,1000) # a constant vec denoted the direction of camara
            @tvec   = new Vec3(0,0,0)    # a vec to translate the whole scene

            @shapes = []

            @rota   = 0                  # global scene rotation around y axis
            @rotb   = 0                  # global scene rotation around x axis

            @ctx.translate(@w,@h)
        else
            throw new Error("Can not get 2d context, browser do not support html5 canvas")

    addShape: (shape) ->
        if shape instanceof Shape
            @shapes.push shape
        else
            throw new TypeError("argument 'shape' must be an instance of Shape")

    proj: (shape) ->
        # project Vec3 to 2d in correspond to camara position
        list=[]
        for vec in shape.points
            roted = vec.rot(@rota,@rotb)
            delta=roted.distance @zvec
            px = roted.x * delta / @zvec.z
            py = roted.y * delta / @zvec.z
            list.push new Vec2(px,py)

        if list.length >= 3
            v1=list[0].to list[1]
            v2=list[0].to list[2]
            if v1.x*v2.y-v1.y*v2.x >0
                return list
            else
                return null


    requestFrame: do ->
        func=do ->
            window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                (callback)->
                    setTimeout callback,1000/60
        return (callback) ->
            func.call window,callback

    render: ->
        @ctx.clearRect(-@w,-@h,@w*2,@h*2)
        for shape in @shapes
            # draw every shape    
            if projs = this.proj shape
                @ctx.beginPath()
                @ctx.moveTo projs[0].x,projs[0].y
                for p in projs[1..]
                    @ctx.lineTo p.x,p.y

                @ctx.closePath()
                @ctx.stroke()



    enterFrame:(func) ->
        if typeof func == 'function'
            @enterframe = func 
        else
            throw new TypeError "augument 'func' should be a function"

    animate: ->
        if typeof @enterframe == 'function'
            ts = this
            this.requestFrame ->
                ts.enterframe()
                ts.render()
                if ts.shapes
                    ts.animate()

    load:(url,scale) ->
        # load object data file from specified url
        xhr = new XMLHttpRequest()
        xhr.open 'GET',url,false
        xhr.send(null)
        if xhr.status == 200
            data = xhr.responseText
        else
            throw new Error "get obj data failed, status: #{xhr.status}"
        scale   = scale || 1
        vecs    = []
        shapes  = []
        for line in data.split('\n')
            if line[0]=='v'
                group=line.split ' '
                vec = new Vec3(
                    scale * parseFloat(group[1]),
                    scale * parseFloat(group[2]),
                    scale * parseFloat(group[3]),
                )
                vecs.push vec
            else if line[0]=='f'
                group = line.split ' '
                shapes.push new Shape (vecs[parseInt(num)-1] for num in group[1..])
        @shapes = @shapes.concat shapes

do ->
    scene = new Scene("scene")
    scene.load "javascripts/logo.obj",100
    a=0
    scene.enterFrame ->
        a+=Math.PI/90
        @rota=Math.PI+ Math.PI * Math.sin(a)/4
    scene.animate()
