#################################################################################
#     File Name           :     scene.coffee
#     Created By          :     shanzi
#     Creation Date       :     [2013-04-05 00:50]
#     Last Modified       :     [2013-04-12 19:18]
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

    wave:(x,a,w,b) ->
        a = a||50
        w = w||Math.PI * (2 - Math.cos(x/4))
        b = b||10
        this.match (i,len)->
            theta=1-i/len
            dx=theta+x-2
            if dx<-1
                p=0
            else if dx<0
                p=-dx*dx+1
            else
                p = 1
            (a+b+a*Math.sin(w*theta+x))*p

    audio:(audio,data) ->
        time= Math.round(audio.currentTime*20)
        len = @tiles.length
        for i in [0...@tiles.length]
            if (ind=time*5+i)>data.length
                @tiles[len-i-1].size = 0
            else
                @tiles[len-i-1].size = data[ind]
        

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
            @ctx.globalAlpha=0.95

            @color = "#69F"
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
        for i in [0...@tilegroup.tiles.length]
            tile = @tilegroup.tiles[i]
            if projs = this.proj tile 
                @ctx.beginPath()
                @ctx.fillStyle=@color
                @ctx.moveTo projs[0].x,projs[0].y
                for p in projs[1..]
                    @ctx.lineTo p.x,p.y
                @ctx.closePath()
                @ctx.fill()
                @ctx.strokeStyle="#FFF"
                @ctx.lineWidth=3
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
    read=document.getElementById "read"
    playimage=document.getElementById "playimage"
    audio = document.getElementById "audio"


    links  = document.querySelectorAll "#links a"
    detail = document.getElementById "detail"
    focuswave = null
    cdiv  = null
    
    
    swif = ->
        scene.color="#69f"
        scene.roty=0
        playimage.src="images/play.svg"

    audio.addEventListener "ended", swif
    audio.addEventListener "emptied", swif

    audio.addEventListener "play", ->
        playimage.src="images/playing.svg"

    read.onclick = ->
        if audio.paused
            audio.currentTime=0
            scene.color="#ff8000"
            if audio.readyState >= 4
                audio.play()
            else
                playimage.src="images/wait.svg"
                audio.autoplay = "autoplay"

    audio.addEventListener "ended", ->
    for link in links
        link.onclick= ->
            cdiv = document.querySelector this.dataset["selector"]
            if not cdiv.classList.contains "focus"
                link.classList.remove "focus" for link in links
                this.classList.add "focus"
                audio.autoplay = ""
                audio.src=""
                audio.src="audio/#{this.dataset['media']}.mp3"
                focuswave = WAVEDATA[this.dataset['media']]
                showdiv = ->
                    for div in document.querySelectorAll "#detail div"
                        div.classList.remove "focus" 
                    cdiv.classList.add "focus"
                    detail.classList.add "show"
                

                if detail.classList.contains "show"
                    detail.classList.remove "show"
                    setTimeout showdiv,500
                else
                    showdiv.call()

    scene = new Scene("scene")
    scene.createTileGroup(5,60,-60)
    scene.rotx=0.25
    scene.enterFrame ->
        @roty+=(Math.PI/128)%(Math.PI*16)
        if audio.paused
            scene.tilegroup.wave(@roty)
        else
            scene.tilegroup.audio(audio,focuswave)
    scene.animate()
