#################################################################################
#     File Name           :     scene.coffee
#     Created By          :     shanzi
#     Creation Date       :     [2013-04-05 00:50]
#     Last Modified       :     [2013-04-09 15:57]
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

    roty:(a) ->
        cosa = Math.cos(a)
        sina = Math.sin(a)
        return new Vec3(
           cosa*@x - sina*@z,
           @y,
           sina*@x + cosa*@z
        )

    rotx:(a) ->
        cosa = Math.cos(a)
        sina = Math.sin(a)
        return new Vec3(
            @x,
            cosa*@y - sina*@z,
            sina*@y + cosa*@z
        )

    rotz:(a) ->
        cosa = Math.cos(a)
        sina = Math.sin(a)
        return new Vec3(
            cosa*@x - sina*@y,
            sina*@x + cosa*@y,
            @z
        )

    distance: (v) ->
        # the length of vector (this - v)
        dx=(@x-v.x)
        dy=(@y-v.y)
        dz=(@z-v.z)
        Math.sqrt(dx*dx+dy*dy+dz*dz)

    reverse: ->
        return new Vec3(-@x,-@y,-@z)

    add:(v) ->
        return new Vec3(
            @x+v.x,
            @y+v.y,
            @z+v.z
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


class Tile
    constructor:(y) ->
        @y = y
        @size = 0

    points: ->
        return [new Vec3(@size  ,  @y , @size )  ,
                new Vec3(-@size ,  @y , @size )  ,
                new Vec3(-@size ,  @y , -@size)  ,
                new Vec3(@size  ,  @y , -@size)]



class TileGroup
    constructor: (count,startz,endz) ->
        @tiles = []
        for i in  [0...count]
            @tiles.push new Tile(startz+ (endz-startz)/count * i)

    sin:(x,a,w,b) ->
        a = a||10
        w = w||Math.PI*2
        b = b||10
        this.match (i,len)->
            theta=1/len
            x=x-1
            if x<-1
                p=0
            else if x<1
                p=-(x+1)*(x-1.5)
            else
                p = 1
            (a+b+a*Math.sin(theta*w + x))*p

    match: (f) ->
        len = @tiles.length
        for i in [0...len]
            @tiles[i].size = f(i,len)




class Scene
    # the scene to handle all shapes to display
    constructor: (id) ->
        @canvas = document.getElementById(id)
        if @canvas.getContext
            @ctx    = @canvas.getContext "2d"

            @w      = @canvas.width/2
            @h      = @canvas.height/2

            @zvec   = new Vec3(0,0,1000) # a constant vec denoted the direction of camara


            @rotx   = 0                  # global scene rotation around x axis
            @roty   = 0                  # global scene rotation around y axis
            @rotz   = 0                  # global scene rotation around z axis

            @ctx.translate(@w,@h)
        else
            throw new Error("Can not get 2d context, browser do not support html5 canvas")

    createTileGroup: (count,az,bz) ->
        @tilegroup=new TileGroup(count,az,bz)

    proj: (tile) ->
        # project Vec3 to 2d in correspond to camara position
        list=[]
        for vec in tile.points()
            roted = vec.roty(@roty).rotx(@rotx)
            delta=roted.distance @zvec
            px = roted.x * delta / @zvec.z
            py = roted.y * delta / @zvec.z
            list.push new Vec2(px,py)
        return list


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
        for tile in @tilegroup.tiles
            # draw every shape    
            if projs = this.proj tile 
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
                ts.animate()


do ->
    scene = new Scene("scene")
    scene.createTileGroup(8,100,-100)
    scene.rotx=0.2
    scene.enterFrame ->
        @roty+=(Math.PI/128)%(Math.PI*4)
        scene.tilegroup.sin(@roty*2,80)

    scene.animate()
