#################################################################################
#     File Name           :     links.coffee
#     Created By          :     shanzi
#     Creation Date       :     [2013-04-10 00:10]
#     Last Modified       :     [2013-04-10 00:46]
#     Description         :     handle links switch action
#################################################################################

do ->
    links  = document.querySelectorAll "#links a"
    detail = document.getElementById "detail"
    cdiv  = null
    for link in links
        link.onclick= ->
            cdiv = document.querySelector this.dataset["selector"]
            if not cdiv.classList.contains "focus"
                link.classList.remove "focus" for link in links
                this.classList.add "focus"

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




