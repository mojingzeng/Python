!function() {
    var ctoplayer = function(obj) {
        if (obj) {
            this.embed(obj)
        }
    };
    ctoplayer.prototype = {
        isEmpty: false,
        isFirstSucess: false,
        inSeeking: false,
        isSeekVideoBuffer: false,
        curRole: "main",
        isTail: false,
        isKaTime: 0,
        isKaLen: 0,
        BufferCoor: {
            startTime: -1,
            endTime: 0,
            kaTempTime: 0
        },
        seekCoor: {
            startTime: -1,
            seekTempTime: 0
        },
        kaCoor: {
            startTime: -1,
            endTime: 0
        },
        videoErrorObj: [["411", "取回过程被用户中止"], ["412", "当下载时发生错误"], ["413", "当解码时发生错误"], ["414", "不支持音频/视频"], ["415", "video abort - 客户端主动终止多媒体数据下载"]],
        coreErrorObj: {
            manifestLoadError: "421",
            manifestLoadTimeOut: "422",
            manifestParsingError: "423",
            manifestNoKey: "424",
            manifestLoadOverDue: "425",
            keyLoadError: "426",
            keyLoadTimeOut: "427",
            binDecriptError: "428",
            fragLoadError: "429",
            fragLoadTimeOut: "430",
            manifestIncompatibleCodecsError: "431",
            fragDecryptError: "432",
            fragParsingError: "433",
            bufferAddCodecError: "434",
            bufferAppendError: "435",
            bufferAppendingError: "436",
            bufferStalledError: "437",
            bufferFullError: "438",
            bufferSeekOverHole: "439",
            bufferNudgeOnStall: "440",
            remuxAllocError: "441",
            internalException: "442"
        },
        embed: function(c) {
            if (c == undefined || !c) {
                this.log("Object does not exist");
                return
            }
            if (typeof c != "object") {
                this.log("Variables type is not a object")
            }
            this.vars = this.standardization({}, c);
            this.initialize()
        },
        initialize: function() {
            var me = this;
            this.domId = this.vars["container"];
            this.dom = $("#" + this.domId);
            this.oriralConf = this.vars["conf"] ? this.vars["conf"] : "";
            this._lid = this.vars["lid"] ? this.vars["lid"] : "";
            this._cid = this.vars["cid"] ? this.vars["cid"] : "";
            this._part = this.vars["part"] ? this.vars["part"] : "0";
            this.uid = this.vars["userId"] ? this.vars["userId"] : "";
            this.centerURL = this.vars["centerURL"] ? this.vars["centerURL"] : "";
            this.Conf = JSON.parse(this.base64decode(this.oriralConf));
            this.oriralSign = "eDu_51Cto_siyuanTlw";
            this.sign = this.MD5(this._lid + this.oriralSign).toString(),
            this.Conf.controlsTrigger = this.Conf.controlsTrigger ? this.Conf.controlsTrigger : "click";
            this.Conf.heartIntervalTime = this.Conf.heartIntervalTime ? parseInt(this.Conf.heartIntervalTime) : 3e4;
            this.ht = 0;
            this.pt = -1;
            this.def = this.getCookie("playDEF") ? this.getCookie("playDEF") : "auto";
            this.cdn = "auto";
            this.playStatus = 0;
            this.fs = 0;
            this.uuid = this.MD5("" + (new Date).getTime() + this.uid + Math.random()).toString();
            this.timerF = "";
            this.memTime = 0;
            this.sd = 1;
            this.netTest = false;
            this.isMute = this.getCookie("isMute") ? this.getCookie("isMute") : "0";
            if (this.Conf.kernel.statFlag) {
                this.heartTimer = setInterval(function() {
                    me.heart()
                }, this.Conf.heartIntervalTime)
            }
            if (this.Conf.kernel.saver) {
                this.Saver(this.Conf.skin.saverate)
            }
            this.loading();
            this.errorNum = 0;
            this.bufferStalledErrorNum = 0;
            setInterval(function() {
                me.errorNum = 0;
                this.bufferStalledErrorNum = 0
            }, 10 * 1e3);
            var FocusNodeName = "";
            $("body").keyup(function(e) {
                FocusNodeName = e.target.nodeName.toLocaleLowerCase();
                if (FocusNodeName === "textarea" || FocusNodeName === "input") {
                    return false
                }
                if (e.keyCode == 32)
                    if (me.playStatus === 0) {
                        me.video_Play()
                    } else {
                        me.video_pause()
                    }
                e.keyCode == 37 && me.video_Play(me.ht - 5);
                e.keyCode == 39 && me.video_Play(me.ht + 5)
            });
            $.get(this.Conf.url_auth, {
                sign: this.sign,
                lesson_id: this._lid
            }, function(res) {
                me.setParms(res)
            }, "json")
        },
        checkLogin: function() {
            var me = this, s;
            $.ajax({
                url: this.Conf.url_check_login,
                async: false,
                data: {
                    lesson_id: me._lid,
                    sign: me.sign
                },
                success: function(res) {
                    s = res
                }
            });
            return s
        },
        loading: function() {
            this.isLoading = true;
            this.loadingDom = $('<div class="error Loading"><p>课程加载中，请稍后...</p></div>');
            this.dom.append(this.loadingDom);
            if (this.video) {
                this.video.hide()
            }
        },
        setParms: function(p) {
            p.head = false;
            p.tail = false;
            p.headover = false;
            p.mainover = false;
            p.tailover = false;
            if (p != undefined && p.ad != undefined) {
                if (p.ad.head != undefined) {
                    p.head = true
                }
                if (p.ad.tail != undefined) {
                    p.tail = true
                }
            }
            this.parms = p;
            this.parms.dispatch.ps = 0;
            if (this.parms.head) {
                this.curRole = "head";
                this.playheadtail()
            } else {
                this.curRole = "main";
                this.playmain();
                this.parms.mainover = true
            }
            if (this.getCookie("playFullScreen")) {
                this.fullScreen()
            }
        },
        videoControls: function() {
            var me = this;
            var controls = $('<div class="controls"></div>');
            this.dom.append(controls);
            var bfloading = $('<div class="bufferLoading"></div>');
            this.dom.append(bfloading);
            this.cts = $('<div class="cts"><div class="mem"></div><div class="played"></div><div class="ps"><p></p></div></div>').mousemove(function(e) {
                var _x = e.clientX - $(this).offset().left;
                $(this).find(".ps").css("left", _x + "px").find("p").html(me.sTo(parseInt(me.dt * (_x / $(this).width()))))
            }).mousedown(function(ev) {
                var disX = ev.clientX - this.offsetLeft
                  , pd = $(this).find(".played")
                  , osl = $(this).offset().left
                  , cY = ev.clientX - osl
                  , dW = $(this).width()
                  , scale = cY / dW;
                pd.width(cY);
                document.onmousemove = function(ev) {
                    cY = ev.clientX - osl;
                    pd.width(cY);
                    scale = cY / dW;
                    scale <= 0 && (scale = 0);
                    scale >= 1 && (scale = 1);
                    scale = parseInt(scale * 1e4) / 1e4
                }
                ;
                document.onmouseup = function() {
                    me.isProcessSeek(false);
                    me.inSeeking = true;
                    me.video_Play(parseInt(scale * me.dt));
                    document.onmousemove = null;
                    document.onmouseup = null
                }
            });
            controls.append(this.cts);
            this.playBtn = $('<div class="play icons fl"></div>');
            controls.append(this.playBtn);
            this.playBtn.click(function() {
                if (me.playStatus === 0) {
                    me.video_Play()
                } else if (me.playStatus === 1) {
                    me.video_pause()
                }
            });
            var prevVideo = $('<div class="prev icons fl"></div>').click(function() {
                me.jump(0, false)
            });
            var nextVideo = $('<div class="next icons fl"></div>').click(function() {
                me.jump(0, true)
            });
            if (this.parms.prevurl) {
                controls.append(prevVideo)
            }
            if (this.parms.nexturl) {
                controls.append(nextVideo)
            }
            this.duration = $('<div class="time fl"><span>00:00</span> / <span class="allTime">00:00</span></div>');
            controls.append(this.duration);
            this.full = $('<div class="full icons fr"></div>').click(function() {
                if (me.fs === 0) {
                    me.fullScreen()
                } else {
                    me.exitFullScreen()
                }
            });
            controls.append(this.full);
            this.ListenerFullScreen();
            this.voice = $('<div class="voice icons fr"><div class="vc" style="height:30px;width:30px;">&nbsp;</div><div class="sv"><div class="c"><div class="b"></div><div class="a"></div></div></div></div>');
            controls.append(this.voice);
            if (this.getCookie("h5playervoice")) {
                setTimeout(function() {
                    setCalV(Math.abs(me.getCookie("h5playervoice")))
                }, 100)
            }
            if (this.getCookie("isMute")) {
                setTimeout(function() {
                    setCalV(0)
                }, 0)
            }
            function CalV(ev) {
                var _sv = me.voice.find(".sv")
                  , ost = _sv.offset().top
                  , vH = 100
                  , scale = 0
                  , cX = 110 - (ev.clientY - ost);
                if (cX >= 100) {
                    cX = 100
                }
                if (cX <= 0) {
                    cX = 0
                }
                scale = cX / vH;
                if (scale >= 1) {
                    scale = 1
                }
                if (scale <= 0) {
                    scale = 0
                }
                scale = parseInt(scale * 100) / 100;
                me.setCookie("h5playervoice", scale, 86400 * 365);
                setCalV(scale)
            }
            function setCalV(n) {
                me.voice.find(".a").height(n * 100 + "%");
                me.v.volume = n;
                if (n == 0) {
                    me.voice.addClass("ed");
                    me.isMute == "1"
                }
                if (n > 0) {
                    me.voice.removeClass("ed");
                    me.isMute == "0"
                }
            }
            this.voice.find(".sv").mousedown(function(ev) {
                CalV(ev);
                document.onmousemove = function(ev) {
                    CalV(ev)
                }
                ;
                document.onmouseup = function() {
                    document.onmousemove = null;
                    document.onmouseup = null
                }
            }).mouseleave(function() {
                document.onmousemove = null;
                document.onmouseup = null
            });
            if (this.Conf.controlsTrigger == "click") {
                this.voice.find(".vc").click(function() {
                    me.voice.toggleClass("active")
                });
                this.voice.on("mouseleave", function() {
                    me.voice.removeClass("active")
                })
            } else {
                me.voice.addClass("trigger-over")
            }
            if (this.getCookie("h5playervoice")) {
                setCalV(parseFloat(this.getCookie("h5playervoice")))
            }
            if (this.Conf.skin.network == 1) {
                this.route = $('<div class="route hl fr"><span>网络：自动</span><ul><li>点击测速</li></ul></div>').click(function(e) {
                    if (e.target.tagName != "LI")
                        return false;
                    var n = $(e.target).index();
                    if (n === 0) {
                        if (me.netTest == 1)
                            return false;
                        me.testSpeed(me.playStatus);
                        return false
                    }
                    if (me.netTest != 2)
                        return false;
                    var m = parseInt($(e.target).attr("val"))
                      , _d = me.parms.dispatch_list[m];
                    if (_d.sp === 0)
                        return false;
                    me.parms.dispatch = _d.value;
                    me.cdn = _d.code;
                    me.ddef(me.def == "hd" ? 0 : 1, me.ht);
                    me.route.find("span").eq(0).text("网络：" + _d.name)
                });
                if (this.netTest == 2) {
                    me.route.find("li").text("重新测速");
                    $.each(me.parms.dispatch_list, function(i, e) {
                        me.route.find("ul").append('<li val="' + i + '">' + e.name + ": " + e.sp + "K/s</li>")
                    })
                }
                controls.append(this.route)
            }
            if (this.parms.dispatch.length > 1) {
                this.defDom = $('<div class="def hl fr"><span>流畅</span><ul><li>高清</li><li>流畅</li></ul></div>').click(function(e) {
                    if (e.target.tagName == "LI") {
                        var n = $(e.target).index();
                        me.def = n == 1 ? "low" : "hd";
                        me.ddef(n, me.ht)
                    }
                });
                controls.append(this.defDom)
            }
            var sdTxt = "倍速"
              , slist = $("<ul></ul>")
              , speArr = ["2.0", "1.75", "1.5", "1.25", "1.0"];
            if (this.getCookie("h5playersd")) {
                var _sd = parseFloat(this.getCookie("h5playersd"));
                _sd = _sd == 2 ? _sd + ".0" : _sd;
                sdTxt = _sd == 1 ? sdTxt : _sd + "x"
            }
            $.each(speArr, function(i, e) {
                slist.append("<li>" + e + "x</li>")
            });
            this.speed = $('<div class="speed hl fr"><span>' + sdTxt + "</span></div>").append(slist).click(function(e) {
                if (e.target.tagName == "LI") {
                    var n = $(e.target).text();
                    me.setSpeed(n)
                }
            });
            controls.append(this.speed);
            this.video.click(function() {
                if (me.playStatus === 0) {
                    me.video_Play()
                } else if (me.playStatus === 1) {
                    me.video_pause()
                }
            });
            this.Tips = $('<div class="Tips"></div>');
            this.dom.append(this.Tips);
            var controlItems = controls.find("div.hl");
            var controlItemSelf = null;
            if (this.Conf.controlsTrigger == "click") {
                controlItems.on("click", function(event) {
                    controlItemSelf = $(this);
                    controlItemSelf.toggleClass("active")
                });
                controlItems.on("mouseleave", function(event) {
                    controlItemSelf = $(this);
                    controlItemSelf.removeClass("active")
                })
            } else {
                controlItems.addClass("trigger-over")
            }
            var cTimer = setTimeout(function() {
                controlsHide()
            }, 5e3);
            this.dom.unbind().mousemove(function() {
                controls.show();
                me.dom.removeClass("noMouse");
                clearTimeout(cTimer);
                cTimer = setTimeout(function() {
                    controlsHide()
                }, 5e3)
            }).mouseleave(function() {
                controlsHide()
            }).dblclick(function() {
                if (me.fs === 0) {
                    me.fullScreen()
                } else {
                    me.exitFullScreen()
                }
            });
            function controlsHide() {
                controls.hide();
                me.dom.addClass("noMouse")
            }
        },
        video_Play: function(t) {
            var loginStatus = true
              , me = this;
            this.loaded();
            this.pausedMask.hide();
            if (this.v) {
                this.v.play()
            }
            this.playStatus = 1;
            this.playBtn.addClass("ps");
            this.dom.removeClass("pause");
            if (t) {
                this.v.currentTime = t;
                this.ht = t
            }
            if (this.Conf.kernel.loginCheckFlag) {
                loginStatus = this.checkLogin()
            }
            if (this.timerF) {
                window.clearTimeout(this.timerF)
            }
            this.timerF = setTimeout(function() {
                me.timer(loginStatus)
            }, 1e3);
            return true
        },
        video_Stop: function() {
            this.playStatus = 0;
            this.dom.addClass("pause");
            this.playBtn.removeClass("ps");
            clearTimeout(this.timerF);
            this.pausedMask.show();
            return true
        },
        video_pause: function() {
            var me = this;
            this.v.pause();
            this.playStatus = 0;
            this.dom.addClass("pause");
            this.playBtn.removeClass("ps");
            clearTimeout(this.timerF);
            this.pausedMask.show();
            return true
        },
        reDuration: function(e) {
            var me = this;
            e = e ? e : Math.round(me.ht);
            this.duration.find("span").eq(0).html(me.sTo(e));
            this.cts.find(".played").width(Math.round(e / me.dt * 1e4) / 100 + "%")
        },
        fullScreen: function(e) {
            this.fs = 1;
            this.full.addClass("off");
            var dom = this.dom[0];
            if (dom) {
                if (dom.requestFullscreen) {
                    dom.requestFullscreen()
                } else if (dom.mozRequestFullScreen) {
                    dom.mozRequestFullScreen()
                } else if (dom.webkitRequestFullScreen) {
                    dom.webkitRequestFullScreen()
                } else if (dom.msRequestFullscreen) {
                    dom.msRequestFullscreen()
                }
            }
            this.setCookie("playFullScreen", 1)
        },
        exitFullScreen: function() {
            this.fs = 0;
            this.full.removeClass("off");
            var dom = document;
            if (dom.exitFullscreen) {
                dom.exitFullscreen()
            } else if (dom.mozCancelFullScreen) {
                dom.mozCancelFullScreen()
            } else if (dom.webkitExitFullscreen) {
                dom.webkitExitFullscreen()
            } else if (dom.msExitFullscreen) {
                dom.msExitFullscreen()
            }
            this.removeCookie("playFullScreen")
        },
        ListenerFullScreen: function() {
            var dom = document
              , me = this;
            dom.addEventListener("fullscreenchange", function() {
                if (!dom.fullscreen)
                    me.exitFullScreen()
            }, false);
            dom.addEventListener("mozfullscreenchange", function() {
                if (!dom.mozFullScreen)
                    me.exitFullScreen()
            }, false);
            dom.addEventListener("webkitfullscreenchange", function() {
                if (!dom.webkitIsFullScreen)
                    me.exitFullScreen()
            }, false);
            dom.addEventListener("msfullscreenchange", function() {
                if (!dom.msFullscreenElement)
                    me.exitFullScreen()
            }, false)
        },
        playheadtail: function() {
            this.loadSource(this.centerURL + "player/play/headerm3u8", 0, true);
            this.pausedMask.remove();
            this.dom.find(".controls").remove();
            this.dom.find(".Tips").remove();
            this.video.unbind("click")
        },
        playmain: function() {
            var me = this
              , pTime = parseInt(this.getCookie("playTime" + me._lid))
              , p = this.parms;
            this.playTime = pTime ? pTime : location.href.match(/playTime=(\d*)/) ? location.href.match(/playTime=(\d*)/)[1] : 0;
            if (this.playTime == 0) {
                if (p.htime) {
                    this.playTime = p.htime
                }
            }
            var ms = p.dispatch.length > 1 ? p.dispatch[1].url : p.dispatch[0].url;
            var playTimeDEF = this.getCookie("playDEF");
            if (playTimeDEF && playTimeDEF != "auto") {
                $.each(p.dispatch, function(i, e) {
                    if (e.name == playTimeDEF) {
                        me.ddef(i, me.playTime)
                    }
                })
            } else {
                this.loadSource(ms, 0, false)
            }
        },
        setSpeed: function(n) {
            this.sd = parseFloat(n.replace("x", ""));
            this.speed.find("span").html(n);
            this.v.playbackRate = this.sd;
            this.setCookie("h5playersd", this.sd, 86400 * 3)
        },
        destroy: function() {
            this.dom.empty();
            if (this.hls) {
                this.hls.destroy();
                if (this.hls.bufferTimer) {
                    clearInterval(this.hls.bufferTimer);
                    this.hls.bufferTimer = undefined
                }
                this.hls = null
            }
        },
        addListener: function(e, f, d, t) {
            if (this.isUndefined(t)) {
                t = false
            }
            var o = this.v;
            if (!this.isUndefined(d)) {
                o = d
            }
            if (o.addEventListener) {
                try {
                    o.addEventListener(e, f, t)
                } catch (event) {}
            } else if (o.attachEvent) {
                try {
                    o.attachEvent("on" + e, f)
                } catch (event) {}
            } else {
                o["on" + e] = f
            }
        },
        isProcessSeek: function(flag) {
            if (!flag) {
                this.seekCoor.seekStartTime = (new Date).getTime();
                return
            }
            if (this.seekCoor.seekStartTime != -1) {
                if (flag) {
                    var seekEndTime = (new Date).getTime();
                    this.seekCoor.seekTempTime = seekEndTime - this.seekCoor.seekStartTime;
                    if (this.seekCoor.seekTempTime > 1e3) {
                        this.isSeekVideoBuffer = true
                    } else {
                        this.isSeekVideoBuffer = false
                    }
                }
            }
        },
        iska: function(val) {
            if (val == -1) {
                if (this.kaCoor.startTime < 0) {
                    this.kaCoor.startTime = (new Date).getTime()
                }
                return
            }
            if (val < 1e3) {
                return
            }
            var isReport = false;
            if (val > 5e3) {
                isReport = true
            }
            this.isKaTime++;
            this.isKaLen += val;
            var eka = this.isKaLen / this.isKaTime;
            if ((new Date).getTime() - this.kaCoor.startTime < 6e5) {
                if (eka > 3e3 && this.isKaTime >= 5) {
                    isReport = true
                }
            }
            if (isReport) {
                var ps = {
                    eType: "videoKa",
                    content: null,
                    message: null
                };
                this.repeatError(ps)
            }
        },
        loadSource: function(url, t, head) {
            var me = this;
            this.dom.empty();
            this.video = $('<video style="width:100%;height:100%;"></video>');
            this.pausedMask = $('<div class="pasue error"><button>&nbsp;</button></div>').click(function() {
                me.video_Play()
            });
            this.dom.append(this.video).append(this.pausedMask);
            if (this.v) {
                this.v = null
            }
            this.v = this.video[0];
            if (!!this.v.canPlayType) {
                var videoEventError = function(event) {
                    var errorTxt;
                    var message;
                    var errorCode;
                    var warmCode = 1;
                    if (event.type === "error") {
                        var mediaError = event.currentTarget.error;
                        switch (mediaError.code) {
                        case 1:
                            errorTxt = "取回过程被用户中止";
                            errorCode = me.videoErrorObj[0][0];
                            break;
                        case 2:
                            errorTxt = "当下载时发生错误";
                            errorCode = me.videoErrorObj[1][0];
                            break;
                        case 3:
                            errorTxt = "当解码时发生错误";
                            errorCode = me.videoErrorObj[2][0];
                            warmCode = 5;
                            break;
                        case 4:
                            errorTxt = "不支持音频/视频";
                            errorCode = me.videoErrorObj[3][0];
                            break
                        }
                    }
                    var ps = {
                        eType: "videoError",
                        content: errorTxt + "( " + errorCode + " )"
                    };
                    try {
                        if (mediaError.message) {
                            message = mediaError.message
                        }
                    } catch (err) {
                        message = errorTxt
                    }
                    ps.message = message;
                    me.repeatError(ps);
                    me.showWarm(warmCode, errorCode)
                };
                var eventTimeupdate = function(event) {
                    $(".bufferLoading").fadeOut(100);
                    if (me.isEmpty) {
                        me.BufferCoor.endTime = (new Date).getTime();
                        me.BufferCoor.kaTempTime = me.BufferCoor.endTime - me.BufferCoor.startTime;
                        me.iska(me.BufferCoor.kaTempTime);
                        me.isProcessSeek(true)
                    }
                    if (me.isFirstSucess) {
                        if (me.isEmpty) {
                            if (me.inSeeking) {
                                if (me.isSeekVideoBuffer) {
                                    var ps = {
                                        eType: "seekVideoBuffer",
                                        content: me.BufferCoor.kaTempTime
                                    };
                                    me.repeatError(ps)
                                }
                            } else {
                                var ps = {
                                    eType: "VideoBuffer",
                                    content: me.BufferCoor.kaTempTime
                                };
                                me.repeatError(ps)
                            }
                        }
                    } else {
                        if (me.isEmpty) {
                            var ps = {
                                eType: "connectBuffer",
                                content: me.BufferCoor.kaTempTime
                            };
                            me.repeatError(ps)
                        }
                        me.isFirstSucess = true
                    }
                    me.isEmpty = false;
                    me.inSeeking = false;
                    me.isSeekVideoBuffer = false;
                    me.seekCoor.seekStartTime = -1;
                    me.kaCoor.startTime = -1
                };
                var eventWaiting = function(event) {
                    $(".bufferLoading").fadeIn(200);
                    me.isEmpty = true;
                    me.iska(-1);
                    me.BufferCoor.startTime = (new Date).getTime()
                };
                if (!head) {
                    this.addListener("waiting", eventWaiting);
                    this.addListener("timeupdate", eventTimeupdate);
                    this.addListener("error", videoEventError)
                }
                this.videoControls();
                if (Hls.isSupported()) {
                    if (this.hls) {
                        this.hls.destroy();
                        if (this.hls.bufferTimer) {
                            clearInterval(this.hls.bufferTimer);
                            this.hls.bufferTimer = undefined
                        }
                        this.hls = null
                    }
                    // 实例化 hls
                    this.hls = new Hls;
                    this.hls.attachMedia(this.v);
                    this.loading();
                    if (head) {
                        // 获取 m3u8 文件
                        this.hls.loadSource(url, this._cid, 0, this.sign, this._part)
                    } else {
                        this.hls.loadSource(url, this._cid, this._lid, this.sign, this._part)
                    }
                    this.hls.on(Hls.Events.MANIFEST_PARSED, function(e, data) {
                        if (me.curRole == "head" || me.curRole == "tail") {
                            me.playTime = 0
                        } else {
                            me.dt = parseInt(data.levels[0].details.totalduration);
                            var pTime = parseInt(me.getCookie("playTime" + me._lid));
                            me.playTime = me.playTime < pTime ? pTime : me.playTime;
                            if (parseInt(me.playTime) == parseInt(me.dt)) {
                                me.playTime = 0
                            }
                            me.heart();
                            me.duration.find("span").eq(1).html(me.sTo(me.dt));
                            if (me.getCookie("h5playersd")) {
                                me.v.playbackRate = me.getCookie("h5playersd")
                            }
                            if (me.playTime > 0) {
                                setTimeout(function() {
                                    me.seekTo()
                                }, 1500)
                            }
                        }
                        me.video_Play(me.playTime)
                    });
                    this.hls.on(Hls.Events.ERROR, function(event, data) {
                        var errorType = data.type;
                        var errorDetails = data.details;
                        var errorFatal = data.fatal;
                        var message;
                        var preMsgHead = "";
                        var errorCode = me.justifyObjContains(errorDetails, me.coreErrorObj);
                        var ps = {
                            eType: "kernelError",
                            content: data.details
                        };
                        switch (data.details) {
                        case Hls.ErrorDetails.MANIFEST_LOAD_ERROR:
                            me.log("error while loading manifest! CODE = " + data.response.code + "TExT =" + data.response.text);
                            try {
                                if (data.response.code === 0) {
                                    message = "this might be a CORS issue, consider installing Allow-Control-Allow-Origin Chrome Extension"
                                }
                            } catch (err) {
                                message = "cannot Load" + url + "Reason:Load " + data.response.text
                            }
                            message = data.response.text;
                            break;
                        case Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT:
                            message = "timeout while loading manifest";
                            break;
                        case Hls.ErrorDetails.BUFFER_STALLED_ERROR:
                            message = "由于缓冲区数据耗尽而导致播放停止时引发";
                            break;
                        case Hls.ErrorDetails.BUFFER_FULL_ERROR:
                            message = "当媒体缓冲区中没有数据可以再添加时，引发它，因为它已满。通过减少最大缓冲区长度来恢复此错误";
                            break;
                        case Hls.ErrorDetails.BUFFER_STALLED_ERROR:
                            message = "尽管currentTime位于缓冲区域，但在播放被卡住时引发";
                            break;
                        case Hls.ErrorDetails.MANIFEST_PARSING_ERROR:
                            message = data.reason;
                            ps.url = data.url;
                            ps.type = 2;
                            break;
                        case Hls.ErrorDetails.LEVEL_LOAD_ERROR:
                            message = "error while loading level playlist";
                            break;
                        case Hls.ErrorDetails.LEVEL_LOAD_TIMEOUT:
                            message = "timeout while loading level playlist";
                            break;
                        case Hls.ErrorDetails.LEVEL_SWITCH_ERROR:
                            message = "error while trying to switch to level " + data.level;
                            break;
                        case Hls.ErrorDetails.FRAG_LOAD_ERROR:
                            message = "error while loading fragment " + data.frag.url;
                            break;
                        case Hls.ErrorDetails.FRAG_LOAD_TIMEOUT:
                            message = "timeout while loading fragment " + data.frag.url;
                            break;
                        case Hls.ErrorDetails.FRAG_LOOP_LOADING_ERROR:
                            message = "Frag Loop Loading Error ";
                            break;
                        case Hls.ErrorDetails.FRAG_DECRYPT_ERROR:
                            message = "Decrypting Error:" + data.reason;
                            break;
                        case Hls.ErrorDetails.FRAG_PARSING_ERROR:
                            message = "Parsing Error:" + data.reason;
                            break;
                        case Hls.ErrorDetails.KEY_LOAD_ERROR:
                            message = "error while loading key " + data.frag.decryptdata.uri;
                            break;
                        case Hls.ErrorDetails.KEY_LOAD_TIMEOUT:
                            message = "timeout while loading key " + data.frag.decryptdata.uri;
                            break;
                        case Hls.ErrorDetails.BUFFER_APPEND_ERROR:
                            message = "Buffer Append Error ";
                            break;
                        case Hls.ErrorDetails.BUFFER_ADD_CODEC_ERROR:
                            thisTemp.log("Buffer Add Codec Error for " + data.mimeType + ":" + data.err.message);
                            message = "Buffer Add Codec Error for " + data.mimeType + ":" + data.err.message;
                            break;
                        case Hls.ErrorDetails.BUFFER_APPENDING_ERROR:
                            thisTemp.log("Buffer Appending Error");
                            message = "Buffer Appending Error";
                            break;
                        default:
                            message = data.details;
                            break
                        }
                        if (data.fatal) {
                            me.hls.destroy();
                            switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                preMsgHead = "fatal network error encountered --- ";
                                if (data.frag) {
                                    ps.ts_url = data.frag.relurl;
                                    ps.type = 1
                                }
                                me.showWarm(0, errorCode);
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                preMsgHead = "fatal media error encountered --- ";
                                me.showWarm(1, errorCode);
                                break;
                            default:
                                preMsgHead = "fatal unrecoverable error encountered --- ";
                                me.showWarm(0, errorCode);
                                break
                            }
                        } else {
                            preMsgHead = "非fatal error --- "
                        }
                        message = preMsgHead + (message != "") ? message : errorDetails;
                        ps.message = message;
                        ps.fatal = data.fatal;
                        me.repeatError(ps)
                    });
                    this.hls.on(Hls.Events.FRAG_LOADED, function(e, data) {
                        setTimeout(function() {
                            me.memTime = Math.round(data.frag.endDTS);
                            var mem = Math.round(me.memTime / me.dt * 100);
                            me.cts.find(".mem").width(mem + "%")
                        }, 1e3)
                    })
                } else {
                    me.showWarm(2, null)
                }
            } else {
                me.showWarm(3, null)
            }
        },
        showWarm: function(num, ecode) {
            this.video_Stop();
            var txt;
            var code = "";
            var useFlash;
            switch (num) {
            case 0:
                txt = "暂无数据，请检查网络或刷新页面重试";
                break;
            case 1:
                txt = "暂无数据，请检查媒体文件或切换其它线路尝试";
                break;
            case 2:
            case 3:
                txt = "当前浏览器不支持新版播放器，请使用最新版 Chrome/Firefox/Edge 等浏览器尝试";
                useFlash = true;
                break;
            case 4:
                txt = "请检查媒体文件或切换其它线路尝试";
                break;
            case 5:
                txt = "请尝试切换到旧版本播放器观看";
                break;
            default:
                txt = "暂无数据，请刷新页面重试";
                break
            }
            if (ecode) {
                code = " (" + ecode + " )"
            }
            error = $('<div class="error cantPlay"><p>' + txt + code + "</p></div>");
            this.dom.empty().append(error);
            if (useFlash) {
                var _Btn = $('<a href="javascript:void(0);">使用旧版观看</a>').click(function() {
                    PlayerStream()
                });
                error.find("p").append(_Btn)
            }
        },
        cantPlay: function(e) {
            this.video_Stop();
            var txt = e == "web" ? "当前浏览器不支持新版播放器，请使用最新版 Chrome/Firefox/Edge 等现代浏览器尝试" : "暂无数据，请检查网络是否正常"
              , error = $('<div class="error cantPlay"><p>' + txt + "</p></div>");
            this.dom.empty().append(error);
            if (e == "web") {
                var _Btn = $('<a href="javascript:void(0);">使用旧版观看</a>').click(function() {
                    PlayerStream()
                });
                error.find("p").append(_Btn)
            }
        },
        ddef: function(e, t) {
            this.isFirstSucess = false;
            this.isEmpty = false;
            this.isSeekVideoBuffer = false;
            this.loadSource(this.parms.dispatch[e].url, t, false);
            this.defDom.find("span").text(this.def == "hd" ? "高清" : "流畅");
            this.setCookie("playDEF", this.def, 86400 * 365)
        },
        seekTo: function() {
            var me = this;
            var jump = $('<span class="blue">从头观看</span>').click(function() {
                st.remove();
                me.video_Play(.1)
            });
            this.playTime = this.playTime > this.dt ? this.dt : this.playTime;
            var st = $("<p><i>!</i>您上次学习到 " + me.sTo(this.playTime) + " 已自动为您续播　</p>").append(jump);
            this.Tips.append(st).show();
            setTimeout(function() {
                st.remove();
                me.TipsHide()
            }, 5e3)
        },
        TipsHide: function() {
            if (this.dt - parseInt(this.ht) > 15) {
                this.Tips.hide()
            }
        },
        Saver: function(n) {
            var me = this;
            setTimeout(function() {
                me.SaverShow(n)
            }, (parseInt(Math.random() * 10) + 5) * 1e3)
        },
        SaverShow: function(n) {
            var me = this
              , fly = 10;
            function randomColor() {
                return "rgba(" + parseInt(Math.random() * 100) + "," + parseInt(Math.random() * 100) + "," + parseInt(Math.random() * 100) + ",1)"
            }
            var top = parseInt(Math.random() * 100) / 100 * me.dom.height(), p;
            if (top > me.dom.height() - 20) {
                top = me.dom.height() - 20
            }
            p = $('<div class="saver" style="animation-duration:' + fly + "s;top:" + top + "px;color:" + randomColor() + ";width:" + me.parms.saverText.length * 16 + 'px;">' + me.parms.saverText + "</div>");
            if (me.playStatus == 1) {
                me.dom.append(p)
            }
            setTimeout(function() {
                p.addClass("overtime");
                if (me.playStatus == 1) {
                    p.siblings(".overtime");
                    p.andSelf();
                    p.remove()
                }
            }, fly * 1e3);
            setTimeout(function() {
                me.SaverShow(n, fly)
            }, (parseInt(Math.random() * 21) - 10 + n) * 1e3)
        },
        testSpeed: function(status) {
            this.video_pause();
            this.dln = 0;
            this.netTest = 1;
            var ul = this.route.find("ul");
            ul.find("li:gt(0)").remove();
            this.testSpeedIng(this.dln++, status)
        },
        testSpeedIng: function(i, status) {
            var me = this
              , ul = this.route.find("ul")
              , t1 = (new Date).getTime()
              , e = this.parms.dispatch_list[i];
            ul.children().eq(0).text("测速中");
            $.ajax({
                url: e.test,
                cache: false,
                complete: function(res) {
                    if (res.readyState == 4) {
                        var t2 = (new Date).getTime()
                          , sp = parseInt(2048e3 / (t2 - t1))
                    } else {
                        var sp = 0
                    }
                    e.sp = sp;
                    ul.append('<li val="' + i + '">' + e.name + ": " + sp + "K/s</li>");
                    ul.children().eq(0).text("重新测速");
                    if (i < me.parms.dispatch_list.length - 1) {
                        me.testSpeedIng(me.dln++, status)
                    } else {
                        me.netTest = 2;
                        if (status == 1) {
                            me.video_Play()
                        }
                    }
                }
            })
        },
        setUid: function(e) {
            this.uid = e
        },
        getuuid: function() {
            return this.uuid
        },
        timer: function(loginStatus) {
            var me = this;
            if (this.timerF) {
                window.clearTimeout(this.timerF)
            }
            this.timerF = setTimeout(function() {
                me.timer(loginStatus)
            }, 1e3);
            if (this.isLoading)
                return false;
            if (me.curRole == "main") {
                if (this.playStatus == 1) {
                    this.pt++;
                    this.ht = this.v.currentTime > this.dt ? this.dt : this.v.currentTime;
                    this.reDuration();
                    this.Conf.kernel.loginCheckTime = 10;
                    if (loginStatus != "login" && loginStatus != true && this.ht > 298) {
                        this.noLogin()
                    }
                }
                this.setCookie("playTime" + this._lid, this.ht, 86400 * 7)
            }
            var rest = this.dt - parseInt(this.ht);
            this.Tips.show().find(".rest").remove();
            if (rest < 16 && this.parms.nexturl) {
                this.Tips.append('<p class="rest"><i>!</i><span class="blue">' + rest + "s</span>后为您播放下一节</p>")
            }
            if (this.Tips.children().length == 0) {
                this.TipsHide()
            }
            if (this.v.ended) {
                if (this.parms.head && this.parms.headover == false) {
                    this.parms.headover = true;
                    this.curRole = "main";
                    this.playmain();
                    this.parms.mainover = true
                } else if (this.parms.tail && this.parms.mainover && this.parms.tailover == false) {
                    this.curRole = "tail";
                    this.playheadtail();
                    this.parms.tailover = true
                } else {
                    this.curRole = "main";
                    $(".saver").remove();
                    this.video_Stop();
                    this.heart();
                    if (window.playerFinishCallback) {
                        playerFinishCallback()
                    } else {
                        this.parms.nexturl && this.jump(.1, true)
                    }
                }
            }
        },
        noLogin: function() {
            this.video_Stop();
            this.dom.empty().append('<div class="error noLogin"><p>未登录用户只能试看5分钟，更多内容请登录后观看<a href="' + this.Conf.url_login + '">登录/注册</a></p></div>')
        },
        loaded: function() {
            this.isLoading = false;
            this.loadingDom.remove();
            this.video.show()
        },
        jump: function(t, type) {
            var url = type ? this.parms.nexturl : this.parms.prevurl;
            setTimeout(function() {
                location.href = url
            }, t * 1e3)
        },
        heart: function(e) {
            var ua = window.navigator.userAgent;
            function myBrowser() {
                var a = ua;
                if (a.indexOf("Opera") > -1) {
                    return "Opera"
                }
                if (a.indexOf("Firefox") > -1) {
                    return "FF"
                }
                if (a.indexOf("Chrome") > -1) {
                    return "Chrome"
                }
                if (a.indexOf("Safari") > -1) {
                    return "Safari"
                }
                if (a.indexOf("compatible") > -1 && a.indexOf("MSIE") > -1 && !isOpera) {
                    return "IE"
                }
            }
            var ps = {
                m: "time",
                id: this._lid,
                uid: this.uid,
                uuid: this.uuid,
                ref: location.href,
                os: ua.indexOf("Windows") ? "Windows" : "other",
                br: myBrowser(),
                fp: 0,
                htime: this.ht,
                dt: this.dt,
                pt: this.pt,
                t: (new Date).getTime(),
                sgin: this.MD5("" + (new Date).getTime() + this.ht + this.dt + this.pt + "eDu_51Cto_siyuanTlw").toString(),
                cdn: this.cdn,
                def: this.def,
                ddef: this.def,
                platform: 4
            };
            if (e) {
                $.extend(ps, e)
            }
            $.get(this.Conf.url_stat, ps)
        },
        repeatError: function(e) {
            var ps = {
                m: "time",
                video_id: this._lid,
                user_id: this.uid,
                uuid: this.uuid,
                type: 0,
                speed: this.parms.dispatch.ps,
                htime: this.ht,
                dt: this.dt,
                pt: this.pt,
                time: (new Date).getTime(),
                sign: this.MD5(this.uid + this._lid + this.ht + this.pt + (new Date).getTime() + "eDu_51Cto_siyuanTlw").toString(),
                cdn: this.cdn,
                ts_url: "",
                platform: 4
            };
            if (e) {
                $.extend(ps, e)
            }
            $.get(this.Conf.url_lag, ps)
        },
        Barrage: function() {},
        isUndefined: function(value) {
            try {
                if (value == "undefined" || value == undefined) {
                    return true
                }
            } catch (event) {}
            return false
        },
        getV: function() {
            return this.v
        },
        sTo: function(d) {
            if (d < 0)
                return "00:00";
            var h = Math.floor(d / 3600)
              , h = h < 10 ? "0" + h : h
              , h = h != 0 ? h + ":" : "";
            var m = Math.floor(d / 60 % 60)
              , m = m < 10 ? "0" + m : m;
            m += ":";
            var s = Math.floor(d % 60)
              , s = s < 10 ? "0" + s : s;
            return h + m + s
        },
        MD5: function(str) {
            var hexcase = 0;
            var b64pad = "";
            var chrsz = 8;
            function hex_md5(s) {
                return binl2hex(core_md5(str2binl(s), s.length * chrsz))
            }
            function b64_md5(s) {
                return binl2b64(core_md5(str2binl(s), s.length * chrsz))
            }
            function str_md5(s) {
                return binl2str(core_md5(str2binl(s), s.length * chrsz))
            }
            function hex_hmac_md5(key, data) {
                return binl2hex(core_hmac_md5(key, data))
            }
            function b64_hmac_md5(key, data) {
                return binl2b64(core_hmac_md5(key, data))
            }
            function str_hmac_md5(key, data) {
                return binl2str(core_hmac_md5(key, data))
            }
            function md5_vm_test() {
                return hex_md5("abc") == "900150983cd24fb0d6963f7d28e17f72"
            }
            function core_md5(x, len) {
                x[len >> 5] |= 128 << len % 32;
                x[(len + 64 >>> 9 << 4) + 14] = len;
                var a = 1732584193;
                var b = -271733879;
                var c = -1732584194;
                var d = 271733878;
                for (var i = 0; i < x.length; i += 16) {
                    var olda = a;
                    var oldb = b;
                    var oldc = c;
                    var oldd = d;
                    a = md5_ff(a, b, c, d, x[i + 0], 7, -680876936);
                    d = md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
                    c = md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
                    b = md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
                    a = md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
                    d = md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
                    c = md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
                    b = md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
                    a = md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
                    d = md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
                    c = md5_ff(c, d, a, b, x[i + 10], 17, -42063);
                    b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
                    a = md5_ff(a, b, c, d, x[i + 12], 7, 1804603682);
                    d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
                    c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
                    b = md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);
                    a = md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
                    d = md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
                    c = md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
                    b = md5_gg(b, c, d, a, x[i + 0], 20, -373897302);
                    a = md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
                    d = md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
                    c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
                    b = md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
                    a = md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
                    d = md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
                    c = md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
                    b = md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
                    a = md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
                    d = md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
                    c = md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
                    b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);
                    a = md5_hh(a, b, c, d, x[i + 5], 4, -378558);
                    d = md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
                    c = md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
                    b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
                    a = md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
                    d = md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
                    c = md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
                    b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
                    a = md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
                    d = md5_hh(d, a, b, c, x[i + 0], 11, -358537222);
                    c = md5_hh(c, d, a, b, x[i + 3], 16, -722521979);
                    b = md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
                    a = md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
                    d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
                    c = md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
                    b = md5_hh(b, c, d, a, x[i + 2], 23, -995338651);
                    a = md5_ii(a, b, c, d, x[i + 0], 6, -198630844);
                    d = md5_ii(d, a, b, c, x[i + 7], 10, 1126891415);
                    c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
                    b = md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
                    a = md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
                    d = md5_ii(d, a, b, c, x[i + 3], 10, -1894986606);
                    c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
                    b = md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
                    a = md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
                    d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
                    c = md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
                    b = md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
                    a = md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
                    d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
                    c = md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
                    b = md5_ii(b, c, d, a, x[i + 9], 21, -343485551);
                    a = safe_add(a, olda);
                    b = safe_add(b, oldb);
                    c = safe_add(c, oldc);
                    d = safe_add(d, oldd)
                }
                return Array(a, b, c, d)
            }
            function md5_cmn(q, a, b, x, s, t) {
                return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b)
            }
            function md5_ff(a, b, c, d, x, s, t) {
                return md5_cmn(b & c | ~b & d, a, b, x, s, t)
            }
            function md5_gg(a, b, c, d, x, s, t) {
                return md5_cmn(b & d | c & ~d, a, b, x, s, t)
            }
            function md5_hh(a, b, c, d, x, s, t) {
                return md5_cmn(b ^ c ^ d, a, b, x, s, t)
            }
            function md5_ii(a, b, c, d, x, s, t) {
                return md5_cmn(c ^ (b | ~d), a, b, x, s, t)
            }
            function core_hmac_md5(key, data) {
                var bkey = str2binl(key);
                if (bkey.length > 16)
                    bkey = core_md5(bkey, key.length * chrsz);
                var ipad = Array(16)
                  , opad = Array(16);
                for (var i = 0; i < 16; i++) {
                    ipad[i] = bkey[i] ^ 909522486;
                    opad[i] = bkey[i] ^ 1549556828
                }
                var hash = core_md5(ipad.concat(str2binl(data)), 512 + data.length * chrsz);
                return core_md5(opad.concat(hash), 512 + 128)
            }
            function safe_add(x, y) {
                var lsw = (x & 65535) + (y & 65535);
                var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
                return msw << 16 | lsw & 65535
            }
            function bit_rol(num, cnt) {
                return num << cnt | num >>> 32 - cnt
            }
            function str2binl(str) {
                var bin = Array();
                var mask = (1 << chrsz) - 1;
                for (var i = 0; i < str.length * chrsz; i += chrsz)
                    bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << i % 32;
                return bin
            }
            function binl2str(bin) {
                var str = "";
                var mask = (1 << chrsz) - 1;
                for (var i = 0; i < bin.length * 32; i += chrsz)
                    str += String.fromCharCode(bin[i >> 5] >>> i % 32 & mask);
                return str
            }
            function binl2hex(binarray) {
                var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
                var str = "";
                for (var i = 0; i < binarray.length * 4; i++) {
                    str += hex_tab.charAt(binarray[i >> 2] >> i % 4 * 8 + 4 & 15) + hex_tab.charAt(binarray[i >> 2] >> i % 4 * 8 & 15)
                }
                return str
            }
            function binl2b64(binarray) {
                var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
                var str = "";
                for (var i = 0; i < binarray.length * 4; i += 3) {
                    var triplet = (binarray[i >> 2] >> 8 * (i % 4) & 255) << 16 | (binarray[i + 1 >> 2] >> 8 * ((i + 1) % 4) & 255) << 8 | binarray[i + 2 >> 2] >> 8 * ((i + 2) % 4) & 255;
                    for (var j = 0; j < 4; j++) {
                        if (i * 8 + j * 6 > binarray.length * 32)
                            str += b64pad;
                        else
                            str += tab.charAt(triplet >> 6 * (3 - j) & 63)
                    }
                }
                return str
            }
            return hex_md5(str)
        },
        Base64: function() {
            _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
            this.encode = function(input) {
                var output = "";
                var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
                var i = 0;
                input = _utf8_encode(input);
                while (i < input.length) {
                    chr1 = input.charCodeAt(i++);
                    chr2 = input.charCodeAt(i++);
                    chr3 = input.charCodeAt(i++);
                    enc1 = chr1 >> 2;
                    enc2 = (chr1 & 3) << 4 | chr2 >> 4;
                    enc3 = (chr2 & 15) << 2 | chr3 >> 6;
                    enc4 = chr3 & 63;
                    if (isNaN(chr2)) {
                        enc3 = enc4 = 64
                    } else if (isNaN(chr3)) {
                        enc4 = 64
                    }
                    output = output + _keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4)
                }
                return output
            }
            ;
            this.decode = function(input) {
                var output = "";
                var chr1, chr2, chr3;
                var enc1, enc2, enc3, enc4;
                var i = 0;
                input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
                while (i < input.length) {
                    enc1 = _keyStr.indexOf(input.charAt(i++));
                    enc2 = _keyStr.indexOf(input.charAt(i++));
                    enc3 = _keyStr.indexOf(input.charAt(i++));
                    enc4 = _keyStr.indexOf(input.charAt(i++));
                    chr1 = enc1 << 2 | enc2 >> 4;
                    chr2 = (enc2 & 15) << 4 | enc3 >> 2;
                    chr3 = (enc3 & 3) << 6 | enc4;
                    output = output + String.fromCharCode(chr1);
                    if (enc3 != 64) {
                        output = output + String.fromCharCode(chr2)
                    }
                    if (enc4 != 64) {
                        output = output + String.fromCharCode(chr3)
                    }
                }
                output = _utf8_decode(output);
                return output
            }
            ;
            _utf8_encode = function(string) {
                string = string.replace(/\r\n/g, "\n");
                var utftext = "";
                for (var n = 0; n < string.length; n++) {
                    var c = string.charCodeAt(n);
                    if (c < 128) {
                        utftext += String.fromCharCode(c)
                    } else if (c > 127 && c < 2048) {
                        utftext += String.fromCharCode(c >> 6 | 192);
                        utftext += String.fromCharCode(c & 63 | 128)
                    } else {
                        utftext += String.fromCharCode(c >> 12 | 224);
                        utftext += String.fromCharCode(c >> 6 & 63 | 128);
                        utftext += String.fromCharCode(c & 63 | 128)
                    }
                }
                return utftext
            }
            ;
            _utf8_decode = function(utftext) {
                var string = "";
                var i = 0;
                var c = c1 = c2 = 0;
                while (i < utftext.length) {
                    c = utftext.charCodeAt(i);
                    if (c < 128) {
                        string += String.fromCharCode(c);
                        i++
                    } else if (c > 191 && c < 224) {
                        c2 = utftext.charCodeAt(i + 1);
                        string += String.fromCharCode((c & 31) << 6 | c2 & 63);
                        i += 2
                    } else {
                        c2 = utftext.charCodeAt(i + 1);
                        c3 = utftext.charCodeAt(i + 2);
                        string += String.fromCharCode((c & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
                        i += 3
                    }
                }
                return string
            }
        },
        base64decode: function(str) {
            var base64EncodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            var base64DecodeChars = new Array(-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,62,-1,-1,-1,63,52,53,54,55,56,57,58,59,60,61,-1,-1,-1,-1,-1,-1,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,-1,-1,-1,-1,-1,-1,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,-1,-1,-1,-1,-1);
            var c1, c2, c3, c4;
            var i, len, out;
            len = str.length;
            i = 0;
            out = "";
            while (i < len) {
                do {
                    c1 = base64DecodeChars[str.charCodeAt(i++) & 255]
                } while (i < len && c1 == -1);if (c1 == -1)
                    break;
                do {
                    c2 = base64DecodeChars[str.charCodeAt(i++) & 255]
                } while (i < len && c2 == -1);if (c2 == -1)
                    break;
                out += String.fromCharCode(c1 << 2 | (c2 & 48) >> 4);
                do {
                    c3 = str.charCodeAt(i++) & 255;
                    if (c3 == 61)
                        return out;
                    c3 = base64DecodeChars[c3]
                } while (i < len && c3 == -1);if (c3 == -1)
                    break;
                out += String.fromCharCode((c2 & 15) << 4 | (c3 & 60) >> 2);
                do {
                    c4 = str.charCodeAt(i++) & 255;
                    if (c4 == 61)
                        return out;
                    c4 = base64DecodeChars[c4]
                } while (i < len && c4 == -1);if (c4 == -1)
                    break;
                out += String.fromCharCode((c3 & 3) << 6 | c4)
            }
            return out
        },
        standardization: function(o, n) {
            var h = {};
            var k;
            for (k in o) {
                h[k] = o[k]
            }
            for (k in n) {
                var type = typeof h[k];
                switch (type) {
                case "number":
                    h[k] = parseFloat(n[k]);
                    break;
                case "string":
                    if (typeof n[k] != "string" && typeof n[k] != "undefined") {
                        h[k] = n[k].toString()
                    } else {
                        h[k] = n[k]
                    }
                    break;
                default:
                    h[k] = n[k];
                    break
                }
            }
            return h
        },
        log: function(val) {
            try {
                console.log("[" + this.getNowDate() + "] :" + val)
            } catch (e) {}
        },
        getNowDate: function() {
            var nowDate = new Date;
            var month = nowDate.getMonth() + 1;
            var date = nowDate.getDate();
            var hours = nowDate.getHours();
            var minutes = nowDate.getMinutes();
            var seconds = nowDate.getSeconds();
            var tMonth = ""
              , tDate = ""
              , tHours = ""
              , tMinutes = ""
              , tSeconds = ""
              , tSeconds = seconds < 10 ? "0" + seconds : seconds + ""
              , tMinutes = minutes < 10 ? "0" + minutes : minutes + ""
              , tHours = hours < 10 ? "0" + hours : hours + ""
              , tDate = date < 10 ? "0" + date : date + ""
              , tMonth = month < 10 ? "0" + month : month + "";
            return tMonth + "/" + tDate + " " + tHours + ":" + tMinutes + ":" + tSeconds
        },
        justifyObjContains: function(str, obj) {
            if (obj[str]) {
                return obj[str]
            } else {
                return -1
            }
        },
        setCookie: function(c, e, b) {
            var d = new Date;
            d.setTime(d.getTime() + b * 1e3);
            var a = b == 0 ? "" : ";expires=" + d.toGMTString();
            document.cookie = c + "=" + e + a + ";path=/"
        },
        getCookie: function(c) {
            var a = document.cookie.split("; ");
            var d = 0;
            for (d = 0; d < a.length; d++) {
                var b = a[d].split("=");
                if (b[0] == c) {
                    return b[1]
                }
            }
            return ""
        },
        removeCookie: function(a) {
            this.setCookie(a, "", -1)
        }
    };
    window.ctoplayer = ctoplayer
}();
"undefined" != typeof window && function(t, e) {
    "object" == typeof exports && "object" == typeof module ? module.exports = e() : "function" == typeof define && define.amd ? define([], e) : "object" == typeof exports ? exports.Hls = e() : t.Hls = e()
}(this, function() {
    return function(t) {
        var e = {};
        function r(i) {
            if (e[i])
                return e[i].exports;
            var a = e[i] = {
                i: i,
                l: !1,
                exports: {}
            };
            return t[i].call(a.exports, a, a.exports, r),
            a.l = !0,
            a.exports
        }
        return r.m = t,
        r.c = e,
        r.d = function(t, e, i) {
            r.o(t, e) || Object.defineProperty(t, e, {
                enumerable: !0,
                get: i
            })
        }
        ,
        r.r = function(t) {
            "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(t, Symbol.toStringTag, {
                value: "Module"
            }),
            Object.defineProperty(t, "__esModule", {
                value: !0
            })
        }
        ,
        r.t = function(t, e) {
            if (1 & e && (t = r(t)),
            8 & e)
                return t;
            if (4 & e && "object" == typeof t && t && t.__esModule)
                return t;
            var i = Object.create(null);
            if (r.r(i),
            Object.defineProperty(i, "default", {
                enumerable: !0,
                value: t
            }),
            2 & e && "string" != typeof t)
                for (var a in t)
                    r.d(i, a, function(e) {
                        return t[e]
                    }
                    .bind(null, a));
            return i
        }
        ,
        r.n = function(t) {
            var e = t && t.__esModule ? function() {
                return t.default
            }
            : function() {
                return t
            }
            ;
            return r.d(e, "a", e),
            e
        }
        ,
        r.o = function(t, e) {
            return Object.prototype.hasOwnProperty.call(t, e)
        }
        ,
        r.p = "/dist/",
        r(r.s = 29)
    }([function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(5);
        function a() {}
        var n = {
            trace: a,
            debug: a,
            log: a,
            warn: a,
            info: a,
            error: a
        }
          , o = n;
        var s = i.getSelfScope();
        function l(t) {
            for (var e = [], r = 1; r < arguments.length; r++)
                e[r - 1] = arguments[r];
            e.forEach(function(e) {
                o[e] = t[e] ? t[e].bind(t) : function(t) {
                    var e = s.console[t];
                    return e ? function() {
                        for (var r = [], i = 0; i < arguments.length; i++)
                            r[i] = arguments[i];
                        r[0] && (r[0] = function(t, e) {
                            return e = "[" + t + "] > " + e
                        }(t, r[0])),
                        e.apply(s.console, r)
                    }
                    : a
                }(e)
            })
        }
        e.enableLogs = function(t) {
            if (!0 === t || "object" == typeof t) {
                l(t, "debug", "log", "info", "warn", "error");
                try {
                    o.log()
                } catch (t) {
                    o = n
                }
            } else
                o = n
        }
        ,
        e.logger = o
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        e.default = {
            MEDIA_ATTACHING: "hlsMediaAttaching",
            MEDIA_ATTACHED: "hlsMediaAttached",
            MEDIA_DETACHING: "hlsMediaDetaching",
            MEDIA_DETACHED: "hlsMediaDetached",
            BUFFER_RESET: "hlsBufferReset",
            BUFFER_CODECS: "hlsBufferCodecs",
            BUFFER_CREATED: "hlsBufferCreated",
            BUFFER_APPENDING: "hlsBufferAppending",
            BUFFER_APPENDED: "hlsBufferAppended",
            BUFFER_EOS: "hlsBufferEos",
            BUFFER_FLUSHING: "hlsBufferFlushing",
            BUFFER_FLUSHED: "hlsBufferFlushed",
            MANIFEST_LOADING: "hlsManifestLoading",
            MANIFEST_LOADED: "hlsManifestLoaded",
            MANIFEST_PARSED: "hlsManifestParsed",
            LEVEL_SWITCHING: "hlsLevelSwitching",
            LEVEL_SWITCHED: "hlsLevelSwitched",
            LEVEL_LOADING: "hlsLevelLoading",
            LEVEL_LOADED: "hlsLevelLoaded",
            LEVEL_UPDATED: "hlsLevelUpdated",
            LEVEL_PTS_UPDATED: "hlsLevelPtsUpdated",
            AUDIO_TRACKS_UPDATED: "hlsAudioTracksUpdated",
            AUDIO_TRACK_SWITCHING: "hlsAudioTrackSwitching",
            AUDIO_TRACK_SWITCHED: "hlsAudioTrackSwitched",
            AUDIO_TRACK_LOADING: "hlsAudioTrackLoading",
            AUDIO_TRACK_LOADED: "hlsAudioTrackLoaded",
            SUBTITLE_TRACKS_UPDATED: "hlsSubtitleTracksUpdated",
            SUBTITLE_TRACK_SWITCH: "hlsSubtitleTrackSwitch",
            SUBTITLE_TRACK_LOADING: "hlsSubtitleTrackLoading",
            SUBTITLE_TRACK_LOADED: "hlsSubtitleTrackLoaded",
            SUBTITLE_FRAG_PROCESSED: "hlsSubtitleFragProcessed",
            INIT_PTS_FOUND: "hlsInitPtsFound",
            FRAG_LOADING: "hlsFragLoading",
            FRAG_LOAD_PROGRESS: "hlsFragLoadProgress",
            FRAG_LOAD_EMERGENCY_ABORTED: "hlsFragLoadEmergencyAborted",
            FRAG_LOADED: "hlsFragLoaded",
            FRAG_DECRYPTED: "hlsFragDecrypted",
            FRAG_PARSING_INIT_SEGMENT: "hlsFragParsingInitSegment",
            FRAG_PARSING_USERDATA: "hlsFragParsingUserdata",
            FRAG_PARSING_METADATA: "hlsFragParsingMetadata",
            FRAG_PARSING_DATA: "hlsFragParsingData",
            FRAG_PARSED: "hlsFragParsed",
            FRAG_BUFFERED: "hlsFragBuffered",
            FRAG_CHANGED: "hlsFragChanged",
            FPS_DROP: "hlsFpsDrop",
            FPS_DROP_LEVEL_CAPPING: "hlsFpsDropLevelCapping",
            ERROR: "hlsError",
            DESTROYING: "hlsDestroying",
            KEY_LOADING: "hlsKeyLoading",
            KEY_LOADED: "hlsKeyLoaded",
            STREAM_STATE_TRANSITION: "hlsStreamStateTransition"
        }
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        }),
        e.ErrorTypes = {
            NETWORK_ERROR: "networkError",
            MEDIA_ERROR: "mediaError",
            KEY_SYSTEM_ERROR: "keySystemError",
            MUX_ERROR: "muxError",
            OTHER_ERROR: "otherError"
        },
        e.ErrorDetails = {
            KEY_SYSTEM_NO_KEYS: "keySystemNoKeys",
            KEY_SYSTEM_NO_ACCESS: "keySystemNoAccess",
            KEY_SYSTEM_NO_SESSION: "keySystemNoSession",
            KEY_SYSTEM_LICENSE_REQUEST_FAILED: "keySystemLicenseRequestFailed",
            MANIFEST_LOAD_ERROR: "manifestLoadError",
            MANIFEST_LOAD_TIMEOUT: "manifestLoadTimeOut",
            MANIFEST_PARSING_ERROR: "manifestParsingError",
            MANIFEST_INCOMPATIBLE_CODECS_ERROR: "manifestIncompatibleCodecsError",
            LEVEL_LOAD_ERROR: "levelLoadError",
            LEVEL_LOAD_TIMEOUT: "levelLoadTimeOut",
            LEVEL_SWITCH_ERROR: "levelSwitchError",
            AUDIO_TRACK_LOAD_ERROR: "audioTrackLoadError",
            AUDIO_TRACK_LOAD_TIMEOUT: "audioTrackLoadTimeOut",
            FRAG_LOAD_ERROR: "fragLoadError",
            FRAG_LOAD_TIMEOUT: "fragLoadTimeOut",
            FRAG_DECRYPT_ERROR: "fragDecryptError",
            FRAG_PARSING_ERROR: "fragParsingError",
            REMUX_ALLOC_ERROR: "remuxAllocError",
            KEY_LOAD_ERROR: "keyLoadError",
            KEY_LOAD_TIMEOUT: "keyLoadTimeOut",
            BUFFER_ADD_CODEC_ERROR: "bufferAddCodecError",
            BUFFER_APPEND_ERROR: "bufferAppendError",
            BUFFER_APPENDING_ERROR: "bufferAppendingError",
            BUFFER_STALLED_ERROR: "bufferStalledError",
            BUFFER_FULL_ERROR: "bufferFullError",
            BUFFER_SEEK_OVER_HOLE: "bufferSeekOverHole",
            BUFFER_NUDGE_ON_STALL: "bufferNudgeOnStall",
            INTERNAL_EXCEPTION: "internalException"
        }
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(5).getSelfScope().Number;
        e.Number = i,
        i.isFinite = i.isFinite || function(t) {
            return "number" == typeof t && isFinite(t)
        }
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(0)
          , a = r(2)
          , n = r(1)
          , o = {
            hlsEventGeneric: !0,
            hlsHandlerDestroying: !0,
            hlsHandlerDestroyed: !0
        }
          , s = function() {
            function t(t) {
                for (var e = [], r = 1; r < arguments.length; r++)
                    e[r - 1] = arguments[r];
                this.hls = t,
                this.onEvent = this.onEvent.bind(this),
                this.handledEvents = e,
                this.useGenericHandler = !0,
                this.registerListeners()
            }
            return t.prototype.destroy = function() {
                this.onHandlerDestroying(),
                this.unregisterListeners(),
                this.onHandlerDestroyed()
            }
            ,
            t.prototype.onHandlerDestroying = function() {}
            ,
            t.prototype.onHandlerDestroyed = function() {}
            ,
            t.prototype.isEventHandler = function() {
                return "object" == typeof this.handledEvents && this.handledEvents.length && "function" == typeof this.onEvent
            }
            ,
            t.prototype.registerListeners = function() {
                this.isEventHandler() && this.handledEvents.forEach(function(t) {
                    if (o[t])
                        throw new Error("Forbidden event-name: " + t);
                    this.hls.on(t, this.onEvent)
                }, this)
            }
            ,
            t.prototype.unregisterListeners = function() {
                this.isEventHandler() && this.handledEvents.forEach(function(t) {
                    this.hls.off(t, this.onEvent)
                }, this)
            }
            ,
            t.prototype.onEvent = function(t, e) {
                this.onEventGeneric(t, e)
            }
            ,
            t.prototype.onEventGeneric = function(t, e) {
                try {
                    (function(t, e) {
                        var r = "on" + t.replace("hls", "");
                        if ("function" != typeof this[r])
                            throw new Error("Event " + t + " has no generic handler in this " + this.constructor.name + " class (tried " + r + ")");
                        return this[r].bind(this, e)
                    }
                    ).call(this, t, e).call()
                } catch (e) {
                    i.logger.error("An internal error happened while handling event " + t + '. Error message: "' + e.message + '". Here is a stacktrace:', e),
                    this.hls.trigger(n.default.ERROR, {
                        type: a.ErrorTypes.OTHER_ERROR,
                        details: a.ErrorDetails.INTERNAL_EXCEPTION,
                        fatal: !1,
                        event: t,
                        err: e
                    })
                }
            }
            ,
            t
        }();
        e.default = s
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        }),
        e.getSelfScope = function() {
            return "undefined" == typeof window ? self : window
        }
    }
    , function(t, e, r) {
        !function(e) {
            var r = /^((?:[a-zA-Z0-9+\-.]+:)?)(\/\/[^\/?#]*)?((?:[^\/\?#]*\/)*.*?)??(;.*?)?(\?.*?)?(#.*?)?$/
              , i = /^([^\/?#]*)(.*)$/
              , a = /(?:\/|^)\.(?=\/)/g
              , n = /(?:\/|^)\.\.\/(?!\.\.\/).*?(?=\/)/g
              , o = {
                buildAbsoluteURL: function(t, e, r) {
                    if (r = r || {},
                    t = t.trim(),
                    !(e = e.trim())) {
                        if (!r.alwaysNormalize)
                            return t;
                        var a = o.parseURL(t);
                        if (!a)
                            throw new Error("Error trying to parse base URL.");
                        return a.path = o.normalizePath(a.path),
                        o.buildURLFromParts(a)
                    }
                    var n = o.parseURL(e);
                    if (!n)
                        throw new Error("Error trying to parse relative URL.");
                    if (n.scheme)
                        return r.alwaysNormalize ? (n.path = o.normalizePath(n.path),
                        o.buildURLFromParts(n)) : e;
                    var s = o.parseURL(t);
                    if (!s)
                        throw new Error("Error trying to parse base URL.");
                    if (!s.netLoc && s.path && "/" !== s.path[0]) {
                        var l = i.exec(s.path);
                        s.netLoc = l[1],
                        s.path = l[2]
                    }
                    s.netLoc && !s.path && (s.path = "/");
                    var u = {
                        scheme: s.scheme,
                        netLoc: n.netLoc,
                        path: null,
                        params: n.params,
                        query: n.query,
                        fragment: n.fragment
                    };
                    if (!n.netLoc && (u.netLoc = s.netLoc,
                    "/" !== n.path[0]))
                        if (n.path) {
                            var d = s.path
                              , c = d.substring(0, d.lastIndexOf("/") + 1) + n.path;
                            u.path = o.normalizePath(c)
                        } else
                            u.path = s.path,
                            n.params || (u.params = s.params,
                            n.query || (u.query = s.query));
                    return null === u.path && (u.path = r.alwaysNormalize ? o.normalizePath(n.path) : n.path),
                    o.buildURLFromParts(u)
                },
                parseURL: function(t) {
                    var e = r.exec(t);
                    return e ? {
                        scheme: e[1] || "",
                        netLoc: e[2] || "",
                        path: e[3] || "",
                        params: e[4] || "",
                        query: e[5] || "",
                        fragment: e[6] || ""
                    } : null
                },
                normalizePath: function(t) {
                    for (t = t.split("").reverse().join("").replace(a, ""); t.length !== (t = t.replace(n, "")).length; )
                        ;
                    return t.split("").reverse().join("")
                },
                buildURLFromParts: function(t) {
                    return t.scheme + t.netLoc + t.path + t.params + t.query + t.fragment
                }
            };
            t.exports = o
        }()
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        e.default = {
            search: function(t, e) {
                for (var r = 0, i = t.length - 1, a = null, n = null; r <= i; ) {
                    var o = e(n = t[a = (r + i) / 2 | 0]);
                    if (o > 0)
                        r = a + 1;
                    else {
                        if (!(o < 0))
                            return n;
                        i = a - 1
                    }
                }
                return null
            }
        }
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = function() {
            function t() {}
            return t.isBuffered = function(t, e) {
                try {
                    if (t)
                        for (var r = t.buffered, i = 0; i < r.length; i++)
                            if (e >= r.start(i) && e <= r.end(i))
                                return !0
                } catch (t) {}
                return !1
            }
            ,
            t.bufferInfo = function(t, e, r) {
                try {
                    if (t) {
                        var i = t.buffered
                          , a = []
                          , n = void 0;
                        for (n = 0; n < i.length; n++)
                            a.push({
                                start: i.start(n),
                                end: i.end(n)
                            });
                        return this.bufferedInfo(a, e, r)
                    }
                } catch (t) {}
                return {
                    len: 0,
                    start: e,
                    end: e,
                    nextStart: void 0
                }
            }
            ,
            t.bufferedInfo = function(t, e, r) {
                var i, a, n, o, s, l = [];
                for (t.sort(function(t, e) {
                    var r = t.start - e.start;
                    return r || e.end - t.end
                }),
                s = 0; s < t.length; s++) {
                    var u = l.length;
                    if (u) {
                        var d = l[u - 1].end;
                        t[s].start - d < r ? t[s].end > d && (l[u - 1].end = t[s].end) : l.push(t[s])
                    } else
                        l.push(t[s])
                }
                for (s = 0,
                i = 0,
                a = n = e; s < l.length; s++) {
                    var c = l[s].start
                      , f = l[s].end;
                    if (e + r >= c && e < f)
                        a = c,
                        i = (n = f) - e;
                    else if (e + r < c) {
                        o = c;
                        break
                    }
                }
                return {
                    len: i,
                    start: a,
                    end: n,
                    nextStart: o
                }
            }
            ,
            t
        }();
        e.BufferHelper = i
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = function() {
            function t() {}
            return t.isHeader = function(t, e) {
                return e + 10 <= t.length && 73 === t[e] && 68 === t[e + 1] && 51 === t[e + 2] && t[e + 3] < 255 && t[e + 4] < 255 && t[e + 6] < 128 && t[e + 7] < 128 && t[e + 8] < 128 && t[e + 9] < 128
            }
            ,
            t.isFooter = function(t, e) {
                return e + 10 <= t.length && 51 === t[e] && 68 === t[e + 1] && 73 === t[e + 2] && t[e + 3] < 255 && t[e + 4] < 255 && t[e + 6] < 128 && t[e + 7] < 128 && t[e + 8] < 128 && t[e + 9] < 128
            }
            ,
            t.getID3Data = function(e, r) {
                for (var i = r, a = 0; t.isHeader(e, r); ) {
                    a += 10,
                    a += t._readSize(e, r + 6),
                    t.isFooter(e, r + 10) && (a += 10),
                    r += a
                }
                if (a > 0)
                    return e.subarray(i, i + a)
            }
            ,
            t._readSize = function(t, e) {
                var r = 0;
                return r = (127 & t[e]) << 21,
                r |= (127 & t[e + 1]) << 14,
                r |= (127 & t[e + 2]) << 7,
                r |= 127 & t[e + 3]
            }
            ,
            t.getTimeStamp = function(e) {
                for (var r = t.getID3Frames(e), i = 0; i < r.length; i++) {
                    var a = r[i];
                    if (t.isTimeStampFrame(a))
                        return t._readTimeStamp(a)
                }
            }
            ,
            t.isTimeStampFrame = function(t) {
                return t && "PRIV" === t.key && "com.apple.streaming.transportStreamTimestamp" === t.info
            }
            ,
            t._getFrameData = function(e) {
                var r = String.fromCharCode(e[0], e[1], e[2], e[3])
                  , i = t._readSize(e, 4);
                return {
                    type: r,
                    size: i,
                    data: e.subarray(10, 10 + i)
                }
            }
            ,
            t.getID3Frames = function(e) {
                for (var r = 0, i = []; t.isHeader(e, r); ) {
                    for (var a = t._readSize(e, r + 6), n = (r += 10) + a; r + 8 < n; ) {
                        var o = t._getFrameData(e.subarray(r))
                          , s = t._decodeFrame(o);
                        s && i.push(s),
                        r += o.size + 10
                    }
                    t.isFooter(e, r) && (r += 10)
                }
                return i
            }
            ,
            t._decodeFrame = function(e) {
                return "PRIV" === e.type ? t._decodePrivFrame(e) : "T" === e.type[0] ? t._decodeTextFrame(e) : "W" === e.type[0] ? t._decodeURLFrame(e) : void 0
            }
            ,
            t._readTimeStamp = function(t) {
                if (8 === t.data.byteLength) {
                    var e = new Uint8Array(t.data)
                      , r = 1 & e[3]
                      , i = (e[4] << 23) + (e[5] << 15) + (e[6] << 7) + e[7];
                    return i /= 45,
                    r && (i += 47721858.84),
                    Math.round(i)
                }
            }
            ,
            t._decodePrivFrame = function(e) {
                if (!(e.size < 2)) {
                    var r = t._utf8ArrayToStr(e.data, !0)
                      , i = new Uint8Array(e.data.subarray(r.length + 1));
                    return {
                        key: e.type,
                        info: r,
                        data: i.buffer
                    }
                }
            }
            ,
            t._decodeTextFrame = function(e) {
                if (!(e.size < 2)) {
                    if ("TXXX" === e.type) {
                        var r = 1
                          , i = t._utf8ArrayToStr(e.data.subarray(r));
                        r += i.length + 1;
                        var a = t._utf8ArrayToStr(e.data.subarray(r));
                        return {
                            key: e.type,
                            info: i,
                            data: a
                        }
                    }
                    var n = t._utf8ArrayToStr(e.data.subarray(1));
                    return {
                        key: e.type,
                        data: n
                    }
                }
            }
            ,
            t._decodeURLFrame = function(e) {
                if ("WXXX" === e.type) {
                    if (e.size < 2)
                        return;
                    var r = 1
                      , i = t._utf8ArrayToStr(e.data.subarray(r));
                    r += i.length + 1;
                    var a = t._utf8ArrayToStr(e.data.subarray(r));
                    return {
                        key: e.type,
                        info: i,
                        data: a
                    }
                }
                var n = t._utf8ArrayToStr(e.data);
                return {
                    key: e.type,
                    data: n
                }
            }
            ,
            t._utf8ArrayToStr = function(t, e) {
                void 0 === e && (e = !1);
                for (var r, i, a, n = t.length, o = "", s = 0; s < n; ) {
                    if (0 === (r = t[s++]) && e)
                        return o;
                    if (0 !== r && 3 !== r)
                        switch (r >> 4) {
                        case 0:
                        case 1:
                        case 2:
                        case 3:
                        case 4:
                        case 5:
                        case 6:
                        case 7:
                            o += String.fromCharCode(r);
                            break;
                        case 12:
                        case 13:
                            i = t[s++],
                            o += String.fromCharCode((31 & r) << 6 | 63 & i);
                            break;
                        case 14:
                            i = t[s++],
                            a = t[s++],
                            o += String.fromCharCode((15 & r) << 12 | (63 & i) << 6 | (63 & a) << 0)
                        }
                }
                return o
            }
            ,
            t
        }()
          , a = i._utf8ArrayToStr;
        e.utf8ArrayToStr = a,
        e.default = i
    }
    , function(t, e, r) {
        "use strict";
        var i = this && this.__extends || function() {
            var t = Object.setPrototypeOf || {
                __proto__: []
            }instanceof Array && function(t, e) {
                t.__proto__ = e
            }
            || function(t, e) {
                for (var r in e)
                    e.hasOwnProperty(r) && (t[r] = e[r])
            }
            ;
            return function(e, r) {
                function i() {
                    this.constructor = e
                }
                t(e, r),
                e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                new i)
            }
        }();
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var a = function(t) {
            function e(e) {
                for (var r = [], i = 1; i < arguments.length; i++)
                    r[i - 1] = arguments[i];
                var a = t.apply(this, [e].concat(r)) || this;
                return a._tickInterval = null,
                a._tickTimer = null,
                a._tickCallCount = 0,
                a._boundTick = a.tick.bind(a),
                a
            }
            return i(e, t),
            e.prototype.onHandlerDestroying = function() {
                this.clearNextTick(),
                this.clearInterval()
            }
            ,
            e.prototype.hasInterval = function() {
                return !!this._tickInterval
            }
            ,
            e.prototype.hasNextTick = function() {
                return !!this._tickTimer
            }
            ,
            e.prototype.setInterval = function(t) {
                return !this._tickInterval && (this._tickInterval = setInterval(this._boundTick, t),
                !0)
            }
            ,
            e.prototype.clearInterval = function() {
                return !!this._tickInterval && (clearInterval(this._tickInterval),
                this._tickInterval = null,
                !0)
            }
            ,
            e.prototype.clearNextTick = function() {
                return !!this._tickTimer && (clearTimeout(this._tickTimer),
                this._tickTimer = null,
                !0)
            }
            ,
            e.prototype.tick = function() {
                this._tickCallCount++,
                1 === this._tickCallCount && (this.doTick(),
                this._tickCallCount > 1 && (this.clearNextTick(),
                this._tickTimer = setTimeout(this._boundTick, 0)),
                this._tickCallCount = 0)
            }
            ,
            e.prototype.doTick = function() {}
            ,
            e
        }(r(4).default);
        e.default = a
    }
    , function(t, e, r) {
        "use strict";
        (function(t) {
            Object.defineProperty(e, "__esModule", {
                value: !0
            });
            var i = r(6)
              , a = r(18)
              , n = function() {
                function e() {
                    var t;
                    this._url = null,
                    this._byteRange = null,
                    this._decryptdata = null,
                    this.tagList = [],
                    this.programDateTime = null,
                    this.rawProgramDateTime = null,
                    this._elementaryStreams = ((t = {})[e.ElementaryStreamTypes.AUDIO] = !1,
                    t[e.ElementaryStreamTypes.VIDEO] = !1,
                    t)
                }
                return Object.defineProperty(e, "ElementaryStreamTypes", {
                    get: function() {
                        return {
                            AUDIO: "audio",
                            VIDEO: "video"
                        }
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                Object.defineProperty(e.prototype, "url", {
                    get: function() {
                        return !this._url && this.relurl && (this._url = i.buildAbsoluteURL(this.baseurl, this.relurl, {
                            alwaysNormalize: !0
                        })),
                        this._url
                    },
                    set: function(t) {
                        this._url = t
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                Object.defineProperty(e.prototype, "byteRange", {
                    get: function() {
                        if (!this._byteRange && !this.rawByteRange)
                            return [];
                        if (this._byteRange)
                            return this._byteRange;
                        var t = [];
                        if (this.rawByteRange) {
                            var e = this.rawByteRange.split("@", 2);
                            if (1 === e.length) {
                                var r = this.lastByteRangeEndOffset;
                                t[0] = r || 0
                            } else
                                t[0] = parseInt(e[1]);
                            t[1] = parseInt(e[0]) + t[0],
                            this._byteRange = t
                        }
                        return t
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                Object.defineProperty(e.prototype, "byteRangeStartOffset", {
                    get: function() {
                        return this.byteRange[0]
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                Object.defineProperty(e.prototype, "byteRangeEndOffset", {
                    get: function() {
                        return this.byteRange[1]
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                Object.defineProperty(e.prototype, "decryptdata", {
                    get: function() {
                        return this._decryptdata || (this._decryptdata = this.fragmentDecryptdataFromLevelkey(this.levelkey, this.sn)),
                        this._decryptdata
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                Object.defineProperty(e.prototype, "endProgramDateTime", {
                    get: function() {
                        if (!t.isFinite(this.programDateTime))
                            return null;
                        var e = t.isFinite(this.duration) ? this.duration : 0;
                        return this.programDateTime + 1e3 * e
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                Object.defineProperty(e.prototype, "encrypted", {
                    get: function() {
                        return !(!this.decryptdata || null === this.decryptdata.uri || null !== this.decryptdata.key)
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                e.prototype.addElementaryStream = function(t) {
                    this._elementaryStreams[t] = !0
                }
                ,
                e.prototype.hasElementaryStream = function(t) {
                    return !0 === this._elementaryStreams[t]
                }
                ,
                e.prototype.createInitializationVector = function(t) {
                    for (var e = new Uint8Array(16), r = 12; r < 16; r++)
                        e[r] = t >> 8 * (15 - r) & 255;
                    return e
                }
                ,
                e.prototype.fragmentDecryptdataFromLevelkey = function(t, e) {
                    var r = t;
                    return t && t.method && t.uri && !t.iv && ((r = new a.default).method = t.method,
                    r.baseuri = t.baseuri,
                    r.reluri = t.reluri,
                    r.iv = this.createInitializationVector(e)),
                    r
                }
                ,
                e
            }();
            e.default = n
        }
        ).call(this, r(3).Number)
    }
    , function(t, e, r) {
        "use strict";
        (function(t) {
            var i = this && this.__extends || function() {
                var t = Object.setPrototypeOf || {
                    __proto__: []
                }instanceof Array && function(t, e) {
                    t.__proto__ = e
                }
                || function(t, e) {
                    for (var r in e)
                        e.hasOwnProperty(r) && (t[r] = e[r])
                }
                ;
                return function(e, r) {
                    function i() {
                        this.constructor = e
                    }
                    t(e, r),
                    e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                    new i)
                }
            }();
            Object.defineProperty(e, "__esModule", {
                value: !0
            });
            var a = r(4)
              , n = r(1);
            e.FragmentState = {
                NOT_LOADED: "NOT_LOADED",
                APPENDING: "APPENDING",
                PARTIAL: "PARTIAL",
                OK: "OK"
            };
            var o = function(r) {
                function o(t) {
                    var e = r.call(this, t, n.default.BUFFER_APPENDED, n.default.FRAG_BUFFERED, n.default.FRAG_LOADED) || this;
                    return e.bufferPadding = .2,
                    e.fragments = Object.create(null),
                    e.timeRanges = Object.create(null),
                    e.config = t.config,
                    e
                }
                return i(o, r),
                o.prototype.destroy = function() {
                    this.fragments = null,
                    this.timeRanges = null,
                    this.config = null,
                    a.default.prototype.destroy.call(this),
                    r.prototype.destroy.call(this)
                }
                ,
                o.prototype.getBufferedFrag = function(t, e) {
                    var r = this.fragments
                      , i = Object.keys(r).filter(function(i) {
                        var a = r[i];
                        if (a.body.type !== e)
                            return !1;
                        if (!a.buffered)
                            return !1;
                        var n = a.body;
                        return n.startPTS <= t && t <= n.endPTS
                    });
                    if (0 === i.length)
                        return null;
                    var a = i.pop();
                    return r[a].body
                }
                ,
                o.prototype.detectEvictedFragments = function(t, e) {
                    var r, i, a = this;
                    Object.keys(this.fragments).forEach(function(n) {
                        var o = a.fragments[n];
                        if (!0 === o.buffered) {
                            var s = o.range[t];
                            if (s) {
                                r = s.time;
                                for (var l = 0; l < r.length; l++)
                                    if (i = r[l],
                                    !1 === a.isTimeBuffered(i.startPTS, i.endPTS, e)) {
                                        a.removeFragment(o.body);
                                        break
                                    }
                            }
                        }
                    })
                }
                ,
                o.prototype.detectPartialFragments = function(t) {
                    var e = this
                      , r = this.getFragmentKey(t)
                      , i = this.fragments[r];
                    i && (i.buffered = !0,
                    Object.keys(this.timeRanges).forEach(function(r) {
                        if (t.hasElementaryStream(r)) {
                            var a = e.timeRanges[r];
                            i.range[r] = e.getBufferedTimes(t.startPTS, t.endPTS, a)
                        }
                    }))
                }
                ,
                o.prototype.getBufferedTimes = function(t, e, r) {
                    for (var i, a, n = [], o = !1, s = 0; s < r.length; s++) {
                        if (i = r.start(s) - this.bufferPadding,
                        a = r.end(s) + this.bufferPadding,
                        t >= i && e <= a) {
                            n.push({
                                startPTS: Math.max(t, r.start(s)),
                                endPTS: Math.min(e, r.end(s))
                            });
                            break
                        }
                        if (t < a && e > i)
                            n.push({
                                startPTS: Math.max(t, r.start(s)),
                                endPTS: Math.min(e, r.end(s))
                            }),
                            o = !0;
                        else if (e <= i)
                            break
                    }
                    return {
                        time: n,
                        partial: o
                    }
                }
                ,
                o.prototype.getFragmentKey = function(t) {
                    return t.type + "_" + t.level + "_" + t.urlId + "_" + t.sn
                }
                ,
                o.prototype.getPartialFragment = function(t) {
                    var e, r, i, a = this, n = null, o = 0;
                    return Object.keys(this.fragments).forEach(function(s) {
                        var l = a.fragments[s];
                        a.isPartial(l) && (r = l.body.startPTS - a.bufferPadding,
                        i = l.body.endPTS + a.bufferPadding,
                        t >= r && t <= i && (e = Math.min(t - r, i - t),
                        o <= e && (n = l.body,
                        o = e)))
                    }),
                    n
                }
                ,
                o.prototype.getState = function(t) {
                    var r = this.getFragmentKey(t)
                      , i = this.fragments[r]
                      , a = e.FragmentState.NOT_LOADED;
                    return void 0 !== i && (a = i.buffered ? !0 === this.isPartial(i) ? e.FragmentState.PARTIAL : e.FragmentState.OK : e.FragmentState.APPENDING),
                    a
                }
                ,
                o.prototype.isPartial = function(t) {
                    return !0 === t.buffered && (void 0 !== t.range.video && !0 === t.range.video.partial || void 0 !== t.range.audio && !0 === t.range.audio.partial)
                }
                ,
                o.prototype.isTimeBuffered = function(t, e, r) {
                    for (var i, a, n = 0; n < r.length; n++) {
                        if (i = r.start(n) - this.bufferPadding,
                        a = r.end(n) + this.bufferPadding,
                        t >= i && e <= a)
                            return !0;
                        if (e <= i)
                            return !1
                    }
                    return !1
                }
                ,
                o.prototype.onFragLoaded = function(e) {
                    var r = e.frag;
                    t.isFinite(r.sn) && !r.bitrateTest && (this.fragments[this.getFragmentKey(r)] = {
                        body: r,
                        range: Object.create(null),
                        buffered: !1
                    })
                }
                ,
                o.prototype.onBufferAppended = function(t) {
                    var e = this;
                    this.timeRanges = t.timeRanges,
                    Object.keys(this.timeRanges).forEach(function(t) {
                        var r = e.timeRanges[t];
                        e.detectEvictedFragments(t, r)
                    })
                }
                ,
                o.prototype.onFragBuffered = function(t) {
                    this.detectPartialFragments(t.frag)
                }
                ,
                o.prototype.hasFragment = function(t) {
                    var e = this.getFragmentKey(t);
                    return void 0 !== this.fragments[e]
                }
                ,
                o.prototype.removeFragment = function(t) {
                    var e = this.getFragmentKey(t);
                    delete this.fragments[e]
                }
                ,
                o.prototype.removeAllFragments = function() {
                    this.fragments = Object.create(null)
                }
                ,
                o
            }(a.default);
            e.FragmentTracker = o
        }
        ).call(this, r(3).Number)
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(2)
          , a = r(0)
          , n = r(1)
          , o = r(5).getSelfScope()
          , s = r(37)
          , l = r(38)
          , u = l.base64ToArrayBuffer
          , d = l.arrayBufferToBase64
          , c = l.dec
          , f = (l.eeb64,
        l.bu,
        l.base64decode,
        l.MD5,
        function() {
            function t(t, e, r) {
                var i = (void 0 === r ? {} : r).removePKCS7Padding
                  , a = void 0 === i || i;
                if (this.logEnabled = !0,
                this.observer = t,
                this.config = e,
                this.removePKCS7Padding = a,
                a)
                    try {
                        var n = o.crypto;
                        n && (this.subtle = n.subtle || n.webkitSubtle)
                    } catch (t) {}
                this.disableWebCrypto = !this.subtle
            }
            return t.prototype.isSync = function() {
                return this.disableWebCrypto && this.config.enableSoftwareAES
            }
            ,
            t.prototype.decrypt = function(t, e, r, i, a, n) {
                var o = parseInt(n.match(/(\d*)\.ts$/)[0].replace(".ts", ""));
                if ("0" == a.part || "1" == a.part && o >= 30 && o % 6 == 0) {
                    var l = {
                        mode: s.mode.ECB,
                        padding: s.pad.Pkcs7
                    };
                    e = s.lib.WordArray.create(new Uint8Array(e)).toString(s.enc.Utf8),
                    e = c(e, a._lid.replace(/_\d*/, "")),
                    e = s.enc.Utf8.parse(e),
                    t = s.AES.decrypt(d(t), e, l),
                    t = u(t.toString(s.enc.Base64))
                }
                i(t)
            }
            ,
            t.prototype.onWebCryptoError = function(t, e, r, o, s) {
                if (this.config.enableSoftwareAES) {
                    a.logger.log("WebCrypto Error, disable WebCrypto API"),
                    this.disableWebCrypto = !0,
                    this.logEnabled = !0;
                    try {
                        this.decrypt(e, r, o, s)
                    } catch (t) {
                        this.observer.trigger(n.default.ERROR, {
                            type: i.ErrorTypes.MEDIA_ERROR,
                            details: i.ErrorDetails.FRAG_DECRYPT_ERROR,
                            fatal: !0,
                            reason: t
                        })
                    }
                } else
                    a.logger.error("decrypting error : " + t.message),
                    this.observer.trigger(n.default.ERROR, {
                        type: i.ErrorTypes.MEDIA_ERROR,
                        details: i.ErrorDetails.FRAG_DECRYPT_ERROR,
                        fatal: !0,
                        reason: t.message
                    })
            }
            ,
            t.prototype.destroy = function() {
                var t = this.decryptor;
                t && (t.destroy(),
                this.decryptor = void 0)
            }
            ,
            t
        }());
        e.default = f
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        }),
        e.getMediaSource = function() {
            if ("undefined" != typeof window)
                return window.MediaSource || window.WebKitMediaSource
        }
    }
    , function(t, e, r) {
        "use strict";
        (function(t) {
            Object.defineProperty(e, "__esModule", {
                value: !0
            });
            var i = r(0);
            function a(e, r, a) {
                var n = e[r]
                  , o = e[a]
                  , s = o.startPTS;
                t.isFinite(s) ? a > r ? (n.duration = s - n.start,
                n.duration < 0 && i.logger.warn("negative duration computed for frag " + n.sn + ",level " + n.level + ", there should be some duration drift between playlist and fragment!")) : (o.duration = n.start - s,
                o.duration < 0 && i.logger.warn("negative duration computed for frag " + o.sn + ",level " + o.level + ", there should be some duration drift between playlist and fragment!")) : o.start = a > r ? n.start + n.duration : Math.max(n.start - o.duration, 0)
            }
            function n(e, r, i, n, o, s) {
                var l = i;
                if (t.isFinite(r.startPTS)) {
                    var u = Math.abs(r.startPTS - i);
                    t.isFinite(r.deltaPTS) ? r.deltaPTS = Math.max(u, r.deltaPTS) : r.deltaPTS = u,
                    l = Math.max(i, r.startPTS),
                    i = Math.min(i, r.startPTS),
                    n = Math.max(n, r.endPTS),
                    o = Math.min(o, r.startDTS),
                    s = Math.max(s, r.endDTS)
                }
                var d = i - r.start;
                r.start = r.startPTS = i,
                r.maxStartPTS = l,
                r.endPTS = n,
                r.startDTS = o,
                r.endDTS = s,
                r.duration = n - i;
                var c, f, h, p = r.sn;
                if (!e || p < e.startSN || p > e.endSN)
                    return 0;
                for (c = p - e.startSN,
                (f = e.fragments)[c] = r,
                h = c; h > 0; h--)
                    a(f, h, h - 1);
                for (h = c; h < f.length - 1; h++)
                    a(f, h, h + 1);
                return e.PTSKnown = !0,
                d
            }
            e.addGroupId = function(t, e, r) {
                switch (e) {
                case "audio":
                    t.audioGroupIds || (t.audioGroupIds = []),
                    t.audioGroupIds.push(r);
                    break;
                case "text":
                    t.textGroupIds || (t.textGroupIds = []),
                    t.textGroupIds.push(r)
                }
            }
            ,
            e.updatePTS = a,
            e.updateFragPTSDTS = n,
            e.mergeDetails = function(e, r) {
                var a, o = Math.max(e.startSN, r.startSN) - r.startSN, s = Math.min(e.endSN, r.endSN) - r.startSN, l = r.startSN - e.startSN, u = e.fragments, d = r.fragments, c = 0;
                if (r.initSegment && e.initSegment && (r.initSegment = e.initSegment),
                s < o)
                    r.PTSKnown = !1;
                else {
                    for (var f = o; f <= s; f++) {
                        var h = u[l + f]
                          , p = d[f];
                        p && h && (c = h.cc - p.cc,
                        t.isFinite(h.startPTS) && (p.start = p.startPTS = h.startPTS,
                        p.endPTS = h.endPTS,
                        p.duration = h.duration,
                        p.backtracked = h.backtracked,
                        p.dropped = h.dropped,
                        a = p))
                    }
                    if (c)
                        for (i.logger.log("discontinuity sliding from playlist, take drift into account"),
                        f = 0; f < d.length; f++)
                            d[f].cc += c;
                    if (a)
                        n(r, a, a.startPTS, a.endPTS, a.startDTS, a.endDTS);
                    else if (l >= 0 && l < u.length) {
                        var g = u[l].start;
                        for (f = 0; f < d.length; f++)
                            d[f].start += g
                    }
                    r.PTSKnown = e.PTSKnown
                }
            }
        }
        ).call(this, r(3).Number)
    }
    , function(t, e, r) {
        "use strict";
        (function(t) {
            var i = this && this.__extends || function() {
                var t = Object.setPrototypeOf || {
                    __proto__: []
                }instanceof Array && function(t, e) {
                    t.__proto__ = e
                }
                || function(t, e) {
                    for (var r in e)
                        e.hasOwnProperty(r) && (t[r] = e[r])
                }
                ;
                return function(e, r) {
                    function i() {
                        this.constructor = e
                    }
                    t(e, r),
                    e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                    new i)
                }
            }();
            Object.defineProperty(e, "__esModule", {
                value: !0
            });
            var a = r(1)
              , n = r(4)
              , o = r(2)
              , s = r(0)
              , l = r(17)
              , u = r(30)
              , d = window.performance
              , c = {
                MANIFEST: "manifest",
                LEVEL: "level",
                AUDIO_TRACK: "audioTrack",
                SUBTITLE_TRACK: "subtitleTrack"
            }
              , f = {
                MAIN: "main",
                AUDIO: "audio",
                SUBTITLE: "subtitle"
            }
              , h = function(e) {
                function r(t) {
                    var r = e.call(this, t, a.default.MANIFEST_LOADING, a.default.LEVEL_LOADING, a.default.AUDIO_TRACK_LOADING, a.default.SUBTITLE_TRACK_LOADING) || this;
                    return r.loaders = {},
                    r
                }
                return i(r, e),
                Object.defineProperty(r, "ContextType", {
                    get: function() {
                        return c
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                Object.defineProperty(r, "LevelType", {
                    get: function() {
                        return f
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                r.canHaveQualityLevels = function(t) {
                    return t !== c.AUDIO_TRACK && t !== c.SUBTITLE_TRACK
                }
                ,
                r.mapContextToLevelType = function(t) {
                    switch (t.type) {
                    case c.AUDIO_TRACK:
                        return f.AUDIO;
                    case c.SUBTITLE_TRACK:
                        return f.SUBTITLE;
                    default:
                        return f.MAIN
                    }
                }
                ,
                r.getResponseUrl = function(t, e) {
                    var r = t.url;
                    return void 0 !== r && 0 !== r.indexOf("data:") || (r = e.url),
                    r
                }
                ,
                r.prototype.createInternalLoader = function(t) {
                    var e = this.hls.config
                      , r = e.pLoader
                      , i = e.loader
                      , a = new (r || i)(e);
                    return t.loader = a,
                    this.loaders[t.type] = a,
                    a
                }
                ,
                r.prototype.getInternalLoader = function(t) {
                    return this.loaders[t.type]
                }
                ,
                r.prototype.resetInternalLoader = function(t) {
                    this.loaders[t] && delete this.loaders[t]
                }
                ,
                r.prototype.destroyInternalLoaders = function() {
                    for (var t in this.loaders) {
                        var e = this.loaders[t];
                        e && e.destroy(),
                        this.resetInternalLoader(t)
                    }
                }
                ,
                r.prototype.destroy = function() {
                    this.destroyInternalLoaders(),
                    e.prototype.destroy.call(this)
                }
                ,
                r.prototype.onManifestLoading = function(t) {
                    this.load(t.url, {
                        type: c.MANIFEST,
                        level: 0,
                        id: null
                    })
                }
                ,
                r.prototype.onLevelLoading = function(t) {
                    this.load(t.url, {
                        type: c.LEVEL,
                        level: t.level,
                        id: t.id
                    })
                }
                ,
                r.prototype.onAudioTrackLoading = function(t) {
                    this.load(t.url, {
                        type: c.AUDIO_TRACK,
                        level: null,
                        id: t.id
                    })
                }
                ,
                r.prototype.onSubtitleTrackLoading = function(t) {
                    this.load(t.url, {
                        type: c.SUBTITLE_TRACK,
                        level: null,
                        id: t.id
                    })
                }
                ,
                r.prototype.load = function(t, e) {
                    var r = this.hls.config;
                    s.logger.debug("Loading playlist of type " + e.type + ", level: " + e.level + ", id: " + e.id);
                    var i, a, n, o, l = this.getInternalLoader(e);
                    if (l) {
                        var u = l.context;
                        if (u && u.url === t)
                            return s.logger.trace("playlist request ongoing"),
                            !1;
                        s.logger.warn("aborting previous loader for type: " + e.type),
                        l.abort()
                    }
                    switch (e.type) {
                    case c.MANIFEST:
                        i = r.manifestLoadingMaxRetry,
                        a = r.manifestLoadingTimeOut,
                        n = r.manifestLoadingRetryDelay,
                        o = r.manifestLoadingMaxRetryTimeout;
                        break;
                    case c.LEVEL:
                        i = 0,
                        a = r.levelLoadingTimeOut;
                        break;
                    default:
                        i = r.levelLoadingMaxRetry,
                        a = r.levelLoadingTimeOut,
                        n = r.levelLoadingRetryDelay,
                        o = r.levelLoadingMaxRetryTimeout
                    }
                    l = this.createInternalLoader(e),
                    e.url = t,
                    e.responseType = e.responseType || "";
                    var d = {
                        timeout: a,
                        maxRetry: i,
                        retryDelay: n,
                        maxRetryDelay: o
                    }
                      , f = {
                        onSuccess: this.loadsuccess.bind(this),
                        onError: this.loaderror.bind(this),
                        onTimeout: this.loadtimeout.bind(this)
                    };
                    return s.logger.debug("Calling internal loader delegate for URL: " + t),
                    l.load(e, d, f),
                    !0
                }
                ,
                r.prototype.loadsuccess = function(t, e, r, i) {
                    if (void 0 === i && (i = null),
                    r.isSidxRequest)
                        return this._handleSidxRequest(t, r),
                        void this._handlePlaylistLoaded(t, e, r, i);
                    this.resetInternalLoader(r.type);
                    var a = t.data;
                    e.tload = d.now(),
                    0 === a.indexOf("#EXTM3U") ? a.indexOf("#EXTINF:") > 0 || a.indexOf("#EXT-X-TARGETDURATION:") > 0 ? this._handleTrackOrLevelPlaylist(t, e, r, i) : this._handleMasterPlaylist(t, e, r, i) : this._handleManifestParsingError(t, r, "no EXTM3U delimiter", i)
                }
                ,
                r.prototype.loaderror = function(t, e, r) {
                    void 0 === r && (r = null),
                    this._handleNetworkError(e, r, !1, t)
                }
                ,
                r.prototype.loadtimeout = function(t, e, r) {
                    void 0 === r && (r = null),
                    this._handleNetworkError(e, r, !0)
                }
                ,
                r.prototype._handleMasterPlaylist = function(t, e, i, n) {
                    var o = this.hls
                      , l = t.data
                      , d = r.getResponseUrl(t, i)
                      , c = u.default.parseMasterPlaylist(l, d);
                    if (c.length) {
                        var f = c.map(function(t) {
                            return {
                                id: t.attrs.AUDIO,
                                codec: t.audioCodec
                            }
                        })
                          , h = u.default.parseMasterPlaylistMedia(l, d, "AUDIO", f)
                          , p = u.default.parseMasterPlaylistMedia(l, d, "SUBTITLES");
                        if (h.length) {
                            var g = !1;
                            h.forEach(function(t) {
                                t.url || (g = !0)
                            }),
                            !1 === g && c[0].audioCodec && !c[0].attrs.AUDIO && (s.logger.log("audio codec signaled in quality level, but no embedded audio track signaled, create one"),
                            h.unshift({
                                type: "main",
                                name: "main"
                            }))
                        }
                        o.trigger(a.default.MANIFEST_LOADED, {
                            levels: c,
                            audioTracks: h,
                            subtitles: p,
                            url: d,
                            stats: e,
                            networkDetails: n
                        })
                    } else
                        this._handleManifestParsingError(t, i, "no level found in manifest", n)
                }
                ,
                r.prototype._handleTrackOrLevelPlaylist = function(e, i, n, o) {
                    var s = this.hls
                      , l = n.id
                      , f = n.level
                      , h = n.type
                      , p = r.getResponseUrl(e, n)
                      , g = t.isFinite(l) ? l : 0
                      , v = t.isFinite(f) ? f : g
                      , y = r.mapContextToLevelType(n)
                      , m = u.default.parseLevelPlaylist(e.data, p, v, y, g);
                    if (m.tload = i.tload,
                    h === c.MANIFEST) {
                        var _ = {
                            url: p,
                            details: m
                        };
                        s.trigger(a.default.MANIFEST_LOADED, {
                            levels: [_],
                            audioTracks: [],
                            url: p,
                            stats: i,
                            networkDetails: o
                        })
                    }
                    if (i.tparsed = d.now(),
                    m.needSidxRanges) {
                        var E = m.initSegment.url;
                        this.load(E, {
                            isSidxRequest: !0,
                            type: h,
                            level: f,
                            levelDetails: m,
                            id: l,
                            rangeStart: 0,
                            rangeEnd: 2048,
                            responseType: "arraybuffer"
                        })
                    } else
                        n.levelDetails = m,
                        this._handlePlaylistLoaded(e, i, n, o)
                }
                ,
                r.prototype._handleSidxRequest = function(t, e) {
                    var r = l.default.parseSegmentIndex(new Uint8Array(t.data));
                    if (r) {
                        var i = r.references
                          , a = e.levelDetails;
                        i.forEach(function(t, e) {
                            var r = t.info
                              , i = a.fragments[e];
                            0 === i.byteRange.length && (i.rawByteRange = String(1 + r.end - r.start) + "@" + String(r.start))
                        }),
                        a.initSegment.rawByteRange = String(r.moovEndOffset) + "@0"
                    }
                }
                ,
                r.prototype._handleManifestParsingError = function(t, e, r, i) {
                    this.hls.trigger(a.default.ERROR, {
                        type: o.ErrorTypes.NETWORK_ERROR,
                        details: o.ErrorDetails.MANIFEST_PARSING_ERROR,
                        fatal: !0,
                        url: t.url,
                        reason: r,
                        networkDetails: i
                    })
                }
                ,
                r.prototype._handleNetworkError = function(t, e, r, i) {
                    var n, l;
                    void 0 === r && (r = !1),
                    void 0 === i && (i = null),
                    s.logger.info("A network error occured while loading a " + t.type + "-type playlist");
                    var u = this.getInternalLoader(t);
                    switch (t.type) {
                    case c.MANIFEST:
                        n = r ? o.ErrorDetails.MANIFEST_LOAD_TIMEOUT : o.ErrorDetails.MANIFEST_LOAD_ERROR,
                        l = !0;
                        break;
                    case c.LEVEL:
                        n = r ? o.ErrorDetails.LEVEL_LOAD_TIMEOUT : o.ErrorDetails.LEVEL_LOAD_ERROR,
                        l = !1;
                        break;
                    case c.AUDIO_TRACK:
                        n = r ? o.ErrorDetails.AUDIO_TRACK_LOAD_TIMEOUT : o.ErrorDetails.AUDIO_TRACK_LOAD_ERROR,
                        l = !1;
                        break;
                    default:
                        l = !1
                    }
                    u && (u.abort(),
                    this.resetInternalLoader(t.type));
                    var d = {
                        type: o.ErrorTypes.NETWORK_ERROR,
                        details: n,
                        fatal: l,
                        url: u.url,
                        loader: u,
                        context: t,
                        networkDetails: e
                    };
                    i && (d.response = i),
                    this.hls.trigger(a.default.ERROR, d)
                }
                ,
                r.prototype._handlePlaylistLoaded = function(t, e, i, n) {
                    var o = i.type
                      , s = i.level
                      , l = i.id
                      , u = i.levelDetails;
                    if (u.targetduration)
                        if (r.canHaveQualityLevels(i.type))
                            this.hls.trigger(a.default.LEVEL_LOADED, {
                                details: u,
                                level: s || 0,
                                id: l || 0,
                                stats: e,
                                networkDetails: n
                            });
                        else
                            switch (o) {
                            case c.AUDIO_TRACK:
                                this.hls.trigger(a.default.AUDIO_TRACK_LOADED, {
                                    details: u,
                                    id: l,
                                    stats: e,
                                    networkDetails: n
                                });
                                break;
                            case c.SUBTITLE_TRACK:
                                this.hls.trigger(a.default.SUBTITLE_TRACK_LOADED, {
                                    details: u,
                                    id: l,
                                    stats: e,
                                    networkDetails: n
                                })
                            }
                    else
                        this._handleManifestParsingError(t, i, "invalid target duration", n)
                }
                ,
                r
            }(n.default);
            e.default = h
        }
        ).call(this, r(3).Number)
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(0)
          , a = r(1)
          , n = Math.pow(2, 32) - 1
          , o = function() {
            function t(t, e) {
                this.observer = t,
                this.remuxer = e
            }
            return t.prototype.resetTimeStamp = function(t) {
                this.initPTS = t
            }
            ,
            t.prototype.resetInitSegment = function(e, r, i, n) {
                if (e && e.byteLength) {
                    var o = this.initData = t.parseInitSegment(e);
                    null == r && (r = "mp4a.40.5"),
                    null == i && (i = "avc1.42e01e");
                    var s = {};
                    o.audio && o.video ? s.audiovideo = {
                        container: "video/mp4",
                        codec: r + "," + i,
                        initSegment: n ? e : null
                    } : (o.audio && (s.audio = {
                        container: "audio/mp4",
                        codec: r,
                        initSegment: n ? e : null
                    }),
                    o.video && (s.video = {
                        container: "video/mp4",
                        codec: i,
                        initSegment: n ? e : null
                    })),
                    this.observer.trigger(a.default.FRAG_PARSING_INIT_SEGMENT, {
                        tracks: s
                    })
                } else
                    r && (this.audioCodec = r),
                    i && (this.videoCodec = i)
            }
            ,
            t.probe = function(e) {
                return t.findBox({
                    data: e,
                    start: 0,
                    end: Math.min(e.length, 16384)
                }, ["moof"]).length > 0
            }
            ,
            t.bin2str = function(t) {
                return String.fromCharCode.apply(null, t)
            }
            ,
            t.readUint16 = function(t, e) {
                t.data && (e += t.start,
                t = t.data);
                var r = t[e] << 8 | t[e + 1];
                return r < 0 ? 65536 + r : r
            }
            ,
            t.readUint32 = function(t, e) {
                t.data && (e += t.start,
                t = t.data);
                var r = t[e] << 24 | t[e + 1] << 16 | t[e + 2] << 8 | t[e + 3];
                return r < 0 ? 4294967296 + r : r
            }
            ,
            t.writeUint32 = function(t, e, r) {
                t.data && (e += t.start,
                t = t.data),
                t[e] = r >> 24,
                t[e + 1] = r >> 16 & 255,
                t[e + 2] = r >> 8 & 255,
                t[e + 3] = 255 & r
            }
            ,
            t.findBox = function(e, r) {
                var i, a, n, o, s, l, u, d = [];
                if (e.data ? (l = e.start,
                o = e.end,
                e = e.data) : (l = 0,
                o = e.byteLength),
                !r.length)
                    return null;
                for (i = l; i < o; )
                    a = t.readUint32(e, i),
                    n = t.bin2str(e.subarray(i + 4, i + 8)),
                    u = a > 1 ? i + a : o,
                    n === r[0] && (1 === r.length ? d.push({
                        data: e,
                        start: i + 8,
                        end: u
                    }) : (s = t.findBox({
                        data: e,
                        start: i + 8,
                        end: u
                    }, r.slice(1))).length && (d = d.concat(s))),
                    i = u;
                return d
            }
            ,
            t.parseSegmentIndex = function(e) {
                var r, i = t.findBox(e, ["moov"])[0], a = i ? i.end : null, n = 0, o = t.findBox(e, ["sidx"]);
                if (!o || !o[0])
                    return null;
                r = [];
                var s = (o = o[0]).data[0];
                n = 0 === s ? 8 : 16;
                var l = t.readUint32(o, n);
                n += 4;
                n += 0 === s ? 8 : 16,
                n += 2;
                var u = o.end + 0
                  , d = t.readUint16(o, n);
                n += 2;
                for (var c = 0; c < d; c++) {
                    var f = n
                      , h = t.readUint32(o, f);
                    f += 4;
                    var p = 2147483647 & h;
                    if (1 === (2147483648 & h) >>> 31)
                        return void console.warn("SIDX has hierarchical references (not supported)");
                    var g = t.readUint32(o, f);
                    f += 4,
                    r.push({
                        referenceSize: p,
                        subsegmentDuration: g,
                        info: {
                            duration: g / l,
                            start: u,
                            end: u + p - 1
                        }
                    }),
                    u += p,
                    n = f += 4
                }
                return {
                    earliestPresentationTime: 0,
                    timescale: l,
                    version: s,
                    referencesCount: d,
                    references: r,
                    moovEndOffset: a
                }
            }
            ,
            t.parseInitSegment = function(e) {
                var r = [];
                return t.findBox(e, ["moov", "trak"]).forEach(function(e) {
                    var a = t.findBox(e, ["tkhd"])[0];
                    if (a) {
                        var n = a.data[a.start]
                          , o = 0 === n ? 12 : 20
                          , s = t.readUint32(a, o)
                          , l = t.findBox(e, ["mdia", "mdhd"])[0];
                        if (l) {
                            o = 0 === (n = l.data[l.start]) ? 12 : 20;
                            var u = t.readUint32(l, o)
                              , d = t.findBox(e, ["mdia", "hdlr"])[0];
                            if (d) {
                                var c = {
                                    soun: "audio",
                                    vide: "video"
                                }[t.bin2str(d.data.subarray(d.start + 8, d.start + 12))];
                                if (c) {
                                    var f = t.findBox(e, ["mdia", "minf", "stbl", "stsd"]);
                                    if (f.length) {
                                        f = f[0];
                                        var h = t.bin2str(f.data.subarray(f.start + 12, f.start + 16));
                                        i.logger.log("MP4Demuxer:" + c + ":" + h + " found")
                                    }
                                    r[s] = {
                                        timescale: u,
                                        type: c
                                    },
                                    r[c] = {
                                        timescale: u,
                                        id: s
                                    }
                                }
                            }
                        }
                    }
                }),
                r
            }
            ,
            t.getStartDTS = function(e, r) {
                var i, a, n;
                return i = t.findBox(r, ["moof", "traf"]),
                a = [].concat.apply([], i.map(function(r) {
                    return t.findBox(r, ["tfhd"]).map(function(i) {
                        var a, n;
                        return a = t.readUint32(i, 4),
                        n = e[a].timescale || 9e4,
                        t.findBox(r, ["tfdt"]).map(function(e) {
                            var r, i;
                            return r = e.data[e.start],
                            i = t.readUint32(e, 4),
                            1 === r && (i *= Math.pow(2, 32),
                            i += t.readUint32(e, 8)),
                            i
                        })[0] / n
                    })
                })),
                n = Math.min.apply(null, a),
                isFinite(n) ? n : 0
            }
            ,
            t.offsetStartDTS = function(e, r, i) {
                t.findBox(r, ["moof", "traf"]).map(function(r) {
                    return t.findBox(r, ["tfhd"]).map(function(a) {
                        var o = t.readUint32(a, 4)
                          , s = e[o].timescale || 9e4;
                        t.findBox(r, ["tfdt"]).map(function(e) {
                            var r = e.data[e.start]
                              , a = t.readUint32(e, 4);
                            if (0 === r)
                                t.writeUint32(e, 4, a - i * s);
                            else {
                                a *= Math.pow(2, 32),
                                a += t.readUint32(e, 8),
                                a -= i * s,
                                a = Math.max(a, 0);
                                var o = Math.floor(a / (n + 1))
                                  , l = Math.floor(a % (n + 1));
                                t.writeUint32(e, 4, o),
                                t.writeUint32(e, 8, l)
                            }
                        })
                    })
                })
            }
            ,
            t.prototype.append = function(e, r, i, n) {
                var o = this.initData;
                o || (this.resetInitSegment(e, this.audioCodec, this.videoCodec, !1),
                o = this.initData);
                var s, l = this.initPTS;
                if (void 0 === l) {
                    var u = t.getStartDTS(o, e);
                    this.initPTS = l = u - r,
                    this.observer.trigger(a.default.INIT_PTS_FOUND, {
                        initPTS: l
                    })
                }
                t.offsetStartDTS(o, e, l),
                s = t.getStartDTS(o, e),
                this.remuxer.remux(o.audio, o.video, null, null, s, i, n, e)
            }
            ,
            t.prototype.destroy = function() {}
            ,
            t
        }();
        e.default = o
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(6)
          , a = function() {
            function t() {
                this.method = null,
                this.key = null,
                this.iv = null,
                this._uri = null
            }
            return Object.defineProperty(t.prototype, "uri", {
                get: function() {
                    return !this._uri && this.reluri && (this._uri = i.buildAbsoluteURL(this.baseuri, this.reluri, {
                        alwaysNormalize: !0
                    })),
                    this._uri
                },
                enumerable: !0,
                configurable: !0
            }),
            t
        }();
        e.default = a
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = {
            audio: {
                a3ds: !0,
                "ac-3": !0,
                "ac-4": !0,
                alac: !0,
                alaw: !0,
                dra1: !0,
                "dts+": !0,
                "dts-": !0,
                dtsc: !0,
                dtse: !0,
                dtsh: !0,
                "ec-3": !0,
                enca: !0,
                g719: !0,
                g726: !0,
                m4ae: !0,
                mha1: !0,
                mha2: !0,
                mhm1: !0,
                mhm2: !0,
                mlpa: !0,
                mp4a: !0,
                "raw ": !0,
                Opus: !0,
                samr: !0,
                sawb: !0,
                sawp: !0,
                sevc: !0,
                sqcp: !0,
                ssmv: !0,
                twos: !0,
                ulaw: !0
            },
            video: {
                avc1: !0,
                avc2: !0,
                avc3: !0,
                avc4: !0,
                avcp: !0,
                drac: !0,
                dvav: !0,
                dvhe: !0,
                encv: !0,
                hev1: !0,
                hvc1: !0,
                mjp2: !0,
                mp4v: !0,
                mvc1: !0,
                mvc2: !0,
                mvc3: !0,
                mvc4: !0,
                resv: !0,
                rv60: !0,
                s263: !0,
                svc1: !0,
                svc2: !0,
                "vc-1": !0,
                vp08: !0,
                vp09: !0
            }
        };
        e.isCodecType = function(t, e) {
            var r = i[e];
            return !!r && !0 === r[t.slice(0, 4)]
        }
        ,
        e.isCodecSupportedInMp4 = function(t, e) {
            return window.MediaSource.isTypeSupported((e || "video") + '/mp4;codecs="' + t + '"')
        }
    }
    , function(t, e, r) {
        "use strict";
        (function(t) {
            Object.defineProperty(e, "__esModule", {
                value: !0
            });
            var i = r(36)
              , a = r(1)
              , n = r(21)
              , o = r(0)
              , s = r(2)
              , l = r(14)
              , u = r(5)
              , d = r(24)
              , c = u.getSelfScope()
              , f = l.getMediaSource()
              , h = function() {
                function e(t, e) {
                    var r = this;
                    this.hls = t,
                    this.id = e;
                    var l = this.observer = new d.Observer
                      , u = t.config
                      , h = function(e, i) {
                        (i = i || {}).frag = r.frag,
                        i.id = r.id,
                        t.trigger(e, i)
                    };
                    l.on(a.default.FRAG_DECRYPTED, h),
                    l.on(a.default.FRAG_PARSING_INIT_SEGMENT, h),
                    l.on(a.default.FRAG_PARSING_DATA, h),
                    l.on(a.default.FRAG_PARSED, h),
                    l.on(a.default.ERROR, h),
                    l.on(a.default.FRAG_PARSING_METADATA, h),
                    l.on(a.default.FRAG_PARSING_USERDATA, h),
                    l.on(a.default.INIT_PTS_FOUND, h);
                    var p = {
                        mp4: f.isTypeSupported("video/mp4"),
                        mpeg: f.isTypeSupported("audio/mpeg"),
                        mp3: f.isTypeSupported('audio/mp4; codecs="mp3"')
                    }
                      , g = navigator.vendor;
                    if (u.enableWorker && "undefined" != typeof Worker) {
                        o.logger.log("demuxing in webworker");
                        var v = void 0;
                        try {
                            v = this.w = i(49),
                            this.onwmsg = this.onWorkerMessage.bind(this),
                            v.addEventListener("message", this.onwmsg),
                            v.onerror = function(e) {
                                t.trigger(a.default.ERROR, {
                                    type: s.ErrorTypes.OTHER_ERROR,
                                    details: s.ErrorDetails.INTERNAL_EXCEPTION,
                                    fatal: !0,
                                    event: "demuxerWorker",
                                    err: {
                                        message: e.message + " (" + e.filename + ":" + e.lineno + ")"
                                    }
                                })
                            }
                            ,
                            v.postMessage({
                                cmd: "init",
                                typeSupported: p,
                                vendor: g,
                                id: e,
                                config: JSON.stringify(u)
                            })
                        } catch (t) {
                            o.logger.warn("Error in worker:", t),
                            o.logger.error("Error while initializing DemuxerWorker, fallback on DemuxerInline"),
                            v && c.URL.revokeObjectURL(v.objectURL),
                            this.demuxer = new n.default(l,p,u,g),
                            this.w = void 0
                        }
                    } else
                        this.demuxer = new n.default(l,p,u,g)
                }
                return e.prototype.destroy = function() {
                    var t = this.w;
                    if (t)
                        t.removeEventListener("message", this.onwmsg),
                        t.terminate(),
                        this.w = null;
                    else {
                        var e = this.demuxer;
                        e && (e.destroy(),
                        this.demuxer = null)
                    }
                    var r = this.observer;
                    r && (r.removeAllListeners(),
                    this.observer = null)
                }
                ,
                e.prototype.push = function(e, r, i, a, n, s, l, u, d) {
                    var c = this.w
                      , f = t.isFinite(n.startDTS) ? n.startDTS : n.start
                      , h = n.decryptdata
                      , p = this.frag
                      , g = !(p && n.cc === p.cc)
                      , v = !(p && n.level === p.level)
                      , y = p && n.sn === p.sn + 1
                      , m = !v && y;
                    if (g && o.logger.log(this.id + ":discontinuity detected"),
                    v && o.logger.log(this.id + ":switch detected"),
                    this.frag = n,
                    c)
                        c.postMessage({
                            cmd: "demux",
                            data: e,
                            decryptdata: h,
                            initSegment: r,
                            audioCodec: i,
                            videoCodec: a,
                            timeOffset: f,
                            discontinuity: g,
                            trackSwitch: v,
                            contiguous: m,
                            duration: s,
                            accurateTimeOffset: l,
                            defaultInitPTS: u,
                            url: d
                        }, e instanceof ArrayBuffer ? [e] : []);
                    else {
                        var _ = this.demuxer;
                        _ && _.push(e, h, r, i, a, f, g, v, m, s, l, u, d)
                    }
                }
                ,
                e.prototype.onWorkerMessage = function(t) {
                    var e = t.data
                      , r = this.hls;
                    switch (e.event) {
                    case "init":
                        c.URL.revokeObjectURL(this.w.objectURL);
                        break;
                    case a.default.FRAG_PARSING_DATA:
                        e.data.data1 = new Uint8Array(e.data1),
                        e.data2 && (e.data.data2 = new Uint8Array(e.data2));
                    default:
                        e.data = e.data || {},
                        e.data.frag = this.frag,
                        e.data.id = this.id,
                        r.trigger(e.event, e.data)
                    }
                }
                ,
                e
            }();
            e.default = h
        }
        ).call(this, r(3).Number)
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i, a = r(1), n = r(2), o = r(13), s = r(39), l = r(17), u = r(40), d = r(43), c = r(44), f = r(47), h = r(5), p = r(0), g = h.getSelfScope();
        try {
            i = g.performance.now.bind(g.performance)
        } catch (t) {
            p.logger.debug("Unable to use Performance API on this environment"),
            i = g.Date.now
        }
        var v = function() {
            function t(t, e, r, i) {
                this.observer = t,
                this.typeSupported = e,
                this.config = r,
                this.vendor = i
            }
            return t.prototype.destroy = function() {
                var t = this.demuxer;
                t && t.destroy()
            }
            ,
            t.prototype.push = function(t, e, r, n, s, l, u, d, c, f, h, p, g) {
                var v = this;
                if (t.byteLength > 0 && null != e && null != e.key && "AES-128" === e.method) {
                    var y = this.decrypter;
                    null == y && (y = this.decrypter = new o.default(this.observer,this.config));
                    var m = i();
                    y.decrypt(t, e.key, e.iv, function(t) {
                        var o = i();
                        v.observer.trigger(a.default.FRAG_DECRYPTED, {
                            stats: {
                                tstart: m,
                                tdecrypt: o
                            }
                        }),
                        v.pushDecrypted(new Uint8Array(t), e, new Uint8Array(r), n, s, l, u, d, c, f, h, p)
                    }, e, g)
                } else
                    this.pushDecrypted(new Uint8Array(t), e, new Uint8Array(r), n, s, l, u, d, c, f, h, p, g)
            }
            ,
            t.prototype.pushDecrypted = function(t, e, r, i, o, h, p, g, v, y, m, _, E) {
                var T = this.demuxer;
                if (!T || (p || g) && !this.probe(t)) {
                    for (var S = this.observer, b = this.typeSupported, A = this.config, R = [{
                        demux: u.default,
                        remux: c.default
                    }, {
                        demux: l.default,
                        remux: f.default
                    }, {
                        demux: s.default,
                        remux: c.default
                    }, {
                        demux: d.default,
                        remux: c.default
                    }], D = 0, L = R.length; D < L; D++) {
                        var w = R[D]
                          , k = w.demux.probe;
                        if (k(t)) {
                            var O = this.remuxer = new w.remux(S,A,b,this.vendor);
                            T = new w.demux(S,O,A,b),
                            this.probe = k;
                            break
                        }
                    }
                    if (!T)
                        return void S.trigger(a.default.ERROR, {
                            type: n.ErrorTypes.MEDIA_ERROR,
                            details: n.ErrorDetails.FRAG_PARSING_ERROR,
                            fatal: !0,
                            reason: "no demux matching with content found"
                        });
                    this.demuxer = T
                }
                var I = this.remuxer;
                (p || g) && (T.resetInitSegment(r, i, o, y),
                I.resetInitSegment()),
                p && (T.resetTimeStamp(_),
                I.resetTimeStamp(_)),
                "function" == typeof T.setDecryptData && T.setDecryptData(e),
                T.append(t, h, v, m)
            }
            ,
            t
        }();
        e.default = v
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(0)
          , a = r(2)
          , n = r(1);
        function o(t, e, r, o) {
            var s, l, u, d, c, f = navigator.userAgent.toLowerCase(), h = o, p = [96e3, 88200, 64e3, 48e3, 44100, 32e3, 24e3, 22050, 16e3, 12e3, 11025, 8e3, 7350];
            if (s = 1 + ((192 & e[r + 2]) >>> 6),
            !((l = (60 & e[r + 2]) >>> 2) > p.length - 1))
                return d = (1 & e[r + 2]) << 2,
                d |= (192 & e[r + 3]) >>> 6,
                i.logger.log("manifest codec:" + o + ",ADTS data:type:" + s + ",sampleingIndex:" + l + "[" + p[l] + "Hz],channelConfig:" + d),
                /firefox/i.test(f) ? l >= 6 ? (s = 5,
                c = new Array(4),
                u = l - 3) : (s = 2,
                c = new Array(2),
                u = l) : -1 !== f.indexOf("android") ? (s = 2,
                c = new Array(2),
                u = l) : (s = 5,
                c = new Array(4),
                o && (-1 !== o.indexOf("mp4a.40.29") || -1 !== o.indexOf("mp4a.40.5")) || !o && l >= 6 ? u = l - 3 : ((o && -1 !== o.indexOf("mp4a.40.2") && (l >= 6 && 1 === d || /vivaldi/i.test(f)) || !o && 1 === d) && (s = 2,
                c = new Array(2)),
                u = l)),
                c[0] = s << 3,
                c[0] |= (14 & l) >> 1,
                c[1] |= (1 & l) << 7,
                c[1] |= d << 3,
                5 === s && (c[1] |= (14 & u) >> 1,
                c[2] = (1 & u) << 7,
                c[2] |= 8,
                c[3] = 0),
                {
                    config: c,
                    samplerate: p[l],
                    channelCount: d,
                    codec: "mp4a.40." + s,
                    manifestCodec: h
                };
            t.trigger(n.default.ERROR, {
                type: a.ErrorTypes.MEDIA_ERROR,
                details: a.ErrorDetails.FRAG_PARSING_ERROR,
                fatal: !0,
                reason: "invalid ADTS sampling index:" + l
            })
        }
        function s(t, e) {
            return 255 === t[e] && 240 == (246 & t[e + 1])
        }
        function l(t, e) {
            return 1 & t[e + 1] ? 7 : 9
        }
        function u(t, e) {
            return (3 & t[e + 3]) << 11 | t[e + 4] << 3 | (224 & t[e + 5]) >>> 5
        }
        function d(t) {
            return 9216e4 / t
        }
        function c(t, e, r, i, a) {
            var n, o, s = t.length;
            if (n = l(t, e),
            o = u(t, e),
            (o -= n) > 0 && e + n + o <= s)
                return {
                    headerLength: n,
                    frameLength: o,
                    stamp: r + i * a
                }
        }
        e.getAudioConfig = o,
        e.isHeaderPattern = s,
        e.getHeaderLength = l,
        e.getFullFrameLength = u,
        e.isHeader = function(t, e) {
            return !!(e + 1 < t.length && s(t, e))
        }
        ,
        e.probe = function(t, e) {
            if (e + 1 < t.length && s(t, e)) {
                var r = l(t, e);
                e + 5 < t.length && (r = u(t, e));
                var i = e + r;
                if (i === t.length || i + 1 < t.length && s(t, i))
                    return !0
            }
            return !1
        }
        ,
        e.initTrackConfig = function(t, e, r, a, n) {
            if (!t.samplerate) {
                var s = o(e, r, a, n);
                t.config = s.config,
                t.samplerate = s.samplerate,
                t.channelCount = s.channelCount,
                t.codec = s.codec,
                t.manifestCodec = s.manifestCodec,
                i.logger.log("parsed codec:" + t.codec + ",rate:" + s.samplerate + ",nb channel:" + s.channelCount)
            }
        }
        ,
        e.getFrameDuration = d,
        e.parseFrameHeader = c,
        e.appendFrame = function(t, e, r, i, a) {
            var n = c(e, r, i, a, d(t.samplerate));
            if (n) {
                var o = n.stamp
                  , s = n.headerLength
                  , l = n.frameLength
                  , u = {
                    unit: e.subarray(r + s, r + s + l),
                    pts: o,
                    dts: o
                };
                return t.samples.push(u),
                t.len += l,
                {
                    sample: u,
                    length: l + s
                }
            }
        }
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = {
            BitratesMap: [32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
            SamplingRateMap: [44100, 48e3, 32e3, 22050, 24e3, 16e3, 11025, 12e3, 8e3],
            SamplesCoefficients: [[0, 72, 144, 12], [0, 0, 0, 0], [0, 72, 144, 12], [0, 144, 144, 12]],
            BytesInSlot: [0, 1, 1, 4],
            appendFrame: function(t, e, r, i, a) {
                if (!(r + 24 > e.length)) {
                    var n = this.parseHeader(e, r);
                    if (n && r + n.frameLength <= e.length) {
                        var o = i + a * (9e4 * n.samplesPerFrame / n.sampleRate)
                          , s = {
                            unit: e.subarray(r, r + n.frameLength),
                            pts: o,
                            dts: o
                        };
                        return t.config = [],
                        t.channelCount = n.channelCount,
                        t.samplerate = n.sampleRate,
                        t.samples.push(s),
                        t.len += n.frameLength,
                        {
                            sample: s,
                            length: n.frameLength
                        }
                    }
                }
            },
            parseHeader: function(t, e) {
                var r = t[e + 1] >> 3 & 3
                  , a = t[e + 1] >> 1 & 3
                  , n = t[e + 2] >> 4 & 15
                  , o = t[e + 2] >> 2 & 3
                  , s = t[e + 2] >> 1 & 1;
                if (1 !== r && 0 !== n && 15 !== n && 3 !== o) {
                    var l = 3 === r ? 3 - a : 3 === a ? 3 : 4
                      , u = 1e3 * i.BitratesMap[14 * l + n - 1]
                      , d = 3 === r ? 0 : 2 === r ? 1 : 2
                      , c = i.SamplingRateMap[3 * d + o]
                      , f = t[e + 3] >> 6 == 3 ? 1 : 2
                      , h = i.SamplesCoefficients[r][a]
                      , p = i.BytesInSlot[a]
                      , g = 8 * h * p;
                    return {
                        sampleRate: c,
                        channelCount: f,
                        frameLength: parseInt(h * u / c + s, 10) * p,
                        samplesPerFrame: g
                    }
                }
            },
            isHeaderPattern: function(t, e) {
                return 255 === t[e] && 224 == (224 & t[e + 1]) && 0 != (6 & t[e + 1])
            },
            isHeader: function(t, e) {
                return !!(e + 1 < t.length && this.isHeaderPattern(t, e))
            },
            probe: function(t, e) {
                if (e + 1 < t.length && this.isHeaderPattern(t, e)) {
                    var r = this.parseHeader(t, e)
                      , i = 4;
                    r && r.frameLength && (i = r.frameLength);
                    var a = e + i;
                    if (a === t.length || a + 1 < t.length && this.isHeaderPattern(t, a))
                        return !0
                }
                return !1
            }
        };
        e.default = i
    }
    , function(t, e, r) {
        "use strict";
        var i = this && this.__extends || function() {
            var t = Object.setPrototypeOf || {
                __proto__: []
            }instanceof Array && function(t, e) {
                t.__proto__ = e
            }
            || function(t, e) {
                for (var r in e)
                    e.hasOwnProperty(r) && (t[r] = e[r])
            }
            ;
            return function(e, r) {
                function i() {
                    this.constructor = e
                }
                t(e, r),
                e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                new i)
            }
        }();
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var a = function(t) {
            function e() {
                return null !== t && t.apply(this, arguments) || this
            }
            return i(e, t),
            e.prototype.trigger = function(t) {
                for (var e = [], r = 1; r < arguments.length; r++)
                    e[r - 1] = arguments[r];
                this.emit.apply(this, [t, t].concat(e))
            }
            ,
            e
        }(r(48).EventEmitter);
        e.Observer = a
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        e.default = {
            toString: function(t) {
                for (var e = "", r = t.length, i = 0; i < r; i++)
                    e += "[" + t.start(i).toFixed(3) + "," + t.end(i).toFixed(3) + "]";
                return e
            }
        }
    }
    , function(t, e, r) {
        "use strict";
        (function(t) {
            Object.defineProperty(e, "__esModule", {
                value: !0
            });
            var i = r(7)
              , a = r(0);
            function n(t, e) {
                for (var r = null, i = 0; i < t.length; i += 1) {
                    var a = t[i];
                    if (a && a.cc === e) {
                        r = a;
                        break
                    }
                }
                return r
            }
            function o(t, e, r) {
                var i = !1;
                return e && e.details && r && (r.endCC > r.startCC || t && t.cc < r.startCC) && (i = !0),
                i
            }
            function s(t, e) {
                var r = t.fragments
                  , i = e.fragments;
                if (i.length && r.length) {
                    var o = n(r, i[0].cc);
                    if (o && (!o || o.startPTS))
                        return o;
                    a.logger.log("No frag in previous level to align on")
                } else
                    a.logger.log("No fragments to align")
            }
            function l(t, e) {
                e.fragments.forEach(function(e) {
                    if (e) {
                        var r = e.start + t;
                        e.start = e.startPTS = r,
                        e.endPTS = r + e.duration
                    }
                }),
                e.PTSKnown = !0
            }
            function u(t, e, r) {
                if (o(t, r, e)) {
                    var i = s(r.details, e);
                    i && (a.logger.log("Adjusting PTS using last level due to CC increase within current level"),
                    l(i.start, e))
                }
            }
            function d(e, r) {
                if (r && r.fragments.length) {
                    if (!e.hasProgramDateTime || !r.hasProgramDateTime)
                        return;
                    var i = r.fragments[0].programDateTime
                      , n = (e.fragments[0].programDateTime - i) / 1e3 + r.fragments[0].start;
                    t.isFinite(n) && (a.logger.log("adjusting PTS using programDateTime delta, sliding:" + n.toFixed(3)),
                    l(n, e))
                }
            }
            e.findFirstFragWithCC = n,
            e.findFragWithCC = function(t, e) {
                return i.default.search(t, function(t) {
                    return t.cc < e ? 1 : t.cc > e ? -1 : 0
                })
            }
            ,
            e.shouldAlignOnDiscontinuities = o,
            e.findDiscontinuousReferenceFrag = s,
            e.adjustPts = l,
            e.alignStream = function(t, e, r) {
                u(t, r, e),
                !r.PTSKnown && e && d(r, e.details)
            }
            ,
            e.alignDiscontinuities = u,
            e.alignPDT = d
        }
        ).call(this, r(3).Number)
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        }),
        e.sendAddTrackEvent = function(t, e) {
            var r = null;
            try {
                r = new window.Event("addtrack")
            } catch (t) {
                (r = document.createEvent("Event")).initEvent("addtrack", !1, !1)
            }
            r.track = t,
            e.dispatchEvent(r)
        }
        ,
        e.clearCurrentCues = function(t) {
            if (t && t.cues)
                for (; t.cues.length > 0; )
                    t.removeCue(t.cues[0])
        }
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(67)
          , a = function() {
            return {
                decode: function(t) {
                    if (!t)
                        return "";
                    if ("string" != typeof t)
                        throw new Error("Error - expected string data.");
                    return decodeURIComponent(encodeURIComponent(t))
                }
            }
        };
        function n() {
            this.window = window,
            this.state = "INITIAL",
            this.buffer = "",
            this.decoder = new a,
            this.regionList = []
        }
        function o() {
            this.values = Object.create(null)
        }
        function s(t, e, r, i) {
            var a = i ? t.split(i) : [t];
            for (var n in a)
                if ("string" == typeof a[n]) {
                    var o = a[n].split(r);
                    if (2 === o.length)
                        e(o[0], o[1])
                }
        }
        o.prototype = {
            set: function(t, e) {
                this.get(t) || "" === e || (this.values[t] = e)
            },
            get: function(t, e, r) {
                return r ? this.has(t) ? this.values[t] : e[r] : this.has(t) ? this.values[t] : e
            },
            has: function(t) {
                return t in this.values
            },
            alt: function(t, e, r) {
                for (var i = 0; i < r.length; ++i)
                    if (e === r[i]) {
                        this.set(t, e);
                        break
                    }
            },
            integer: function(t, e) {
                /^-?\d+$/.test(e) && this.set(t, parseInt(e, 10))
            },
            percent: function(t, e) {
                return !!(e.match(/^([\d]{1,3})(\.[\d]*)?%$/) && (e = parseFloat(e)) >= 0 && e <= 100) && (this.set(t, e),
                !0)
            }
        };
        var l = new i.default(0,0,0)
          , u = "middle" === l.align ? "middle" : "center";
        function d(t, e, r) {
            var i = t;
            function a() {
                var e = function(t) {
                    function e(t, e, r, i) {
                        return 3600 * (0 | t) + 60 * (0 | e) + (0 | r) + (0 | i) / 1e3
                    }
                    var r = t.match(/^(\d+):(\d{2})(:\d{2})?\.(\d{3})/);
                    return r ? r[3] ? e(r[1], r[2], r[3].replace(":", ""), r[4]) : r[1] > 59 ? e(r[1], r[2], 0, r[4]) : e(0, r[1], r[2], r[4]) : null
                }(t);
                if (null === e)
                    throw new Error("Malformed timestamp: " + i);
                return t = t.replace(/^[^\sa-zA-Z-]+/, ""),
                e
            }
            function n() {
                t = t.replace(/^\s+/, "")
            }
            if (n(),
            e.startTime = a(),
            n(),
            "--\x3e" !== t.substr(0, 3))
                throw new Error("Malformed time stamp (time stamps must be separated by '--\x3e'): " + i);
            t = t.substr(3),
            n(),
            e.endTime = a(),
            n(),
            function(t, e) {
                var i = new o;
                s(t, function(t, e) {
                    switch (t) {
                    case "region":
                        for (var a = r.length - 1; a >= 0; a--)
                            if (r[a].id === e) {
                                i.set(t, r[a].region);
                                break
                            }
                        break;
                    case "vertical":
                        i.alt(t, e, ["rl", "lr"]);
                        break;
                    case "line":
                        var n = e.split(",")
                          , o = n[0];
                        i.integer(t, o),
                        i.percent(t, o) && i.set("snapToLines", !1),
                        i.alt(t, o, ["auto"]),
                        2 === n.length && i.alt("lineAlign", n[1], ["start", u, "end"]);
                        break;
                    case "position":
                        n = e.split(","),
                        i.percent(t, n[0]),
                        2 === n.length && i.alt("positionAlign", n[1], ["start", u, "end", "line-left", "line-right", "auto"]);
                        break;
                    case "size":
                        i.percent(t, e);
                        break;
                    case "align":
                        i.alt(t, e, ["start", u, "end", "left", "right"])
                    }
                }, /:/, /\s/),
                e.region = i.get("region", null),
                e.vertical = i.get("vertical", "");
                var a = i.get("line", "auto");
                "auto" === a && -1 === l.line && (a = -1),
                e.line = a,
                e.lineAlign = i.get("lineAlign", "start"),
                e.snapToLines = i.get("snapToLines", !0),
                e.size = i.get("size", 100),
                e.align = i.get("align", u);
                var n = i.get("position", "auto");
                "auto" === n && 50 === l.position && (n = "start" === e.align || "left" === e.align ? 0 : "end" === e.align || "right" === e.align ? 100 : 50),
                e.position = n
            }(t, e)
        }
        function c(t) {
            return t.replace(/<br(?: \/)?>/gi, "\n")
        }
        e.fixLineBreaks = c,
        n.prototype = {
            parse: function(t) {
                var e = this;
                function r() {
                    var t = e.buffer
                      , r = 0;
                    for (t = c(t); r < t.length && "\r" !== t[r] && "\n" !== t[r]; )
                        ++r;
                    var i = t.substr(0, r);
                    return "\r" === t[r] && ++r,
                    "\n" === t[r] && ++r,
                    e.buffer = t.substr(r),
                    i
                }
                function a(t) {
                    s(t, function(t, e) {
                        t
                    }, /:/)
                }
                t && (e.buffer += e.decoder.decode(t, {
                    stream: !0
                }));
                try {
                    var n = void 0;
                    if ("INITIAL" === e.state) {
                        if (!/\r\n|\n/.test(e.buffer))
                            return this;
                        var o = (n = r()).match(/^(ï»¿)?WEBVTT([ \t].*)?$/);
                        if (!o || !o[0])
                            throw new Error("Malformed WebVTT signature.");
                        e.state = "HEADER"
                    }
                    for (var l = !1; e.buffer; ) {
                        if (!/\r\n|\n/.test(e.buffer))
                            return this;
                        switch (l ? l = !1 : n = r(),
                        e.state) {
                        case "HEADER":
                            /:/.test(n) ? a(n) : n || (e.state = "ID");
                            continue;
                        case "NOTE":
                            n || (e.state = "ID");
                            continue;
                        case "ID":
                            if (/^NOTE($|[ \t])/.test(n)) {
                                e.state = "NOTE";
                                break
                            }
                            if (!n)
                                continue;
                            if (e.cue = new i.default(0,0,""),
                            e.state = "CUE",
                            -1 === n.indexOf("--\x3e")) {
                                e.cue.id = n;
                                continue
                            }
                        case "CUE":
                            try {
                                d(n, e.cue, e.regionList)
                            } catch (t) {
                                e.cue = null,
                                e.state = "BADCUE";
                                continue
                            }
                            e.state = "CUETEXT";
                            continue;
                        case "CUETEXT":
                            var u = -1 !== n.indexOf("--\x3e");
                            if (!n || u && (l = !0)) {
                                e.oncue && e.oncue(e.cue),
                                e.cue = null,
                                e.state = "ID";
                                continue
                            }
                            e.cue.text && (e.cue.text += "\n"),
                            e.cue.text += n;
                            continue;
                        case "BADCUE":
                            n || (e.state = "ID");
                            continue
                        }
                    }
                } catch (t) {
                    "CUETEXT" === e.state && e.cue && e.oncue && e.oncue(e.cue),
                    e.cue = null,
                    e.state = "INITIAL" === e.state ? "BADWEBVTT" : "BADCUE"
                }
                return this
            },
            flush: function() {
                try {
                    if (this.buffer += this.decoder.decode(),
                    (this.cue || "HEADER" === this.state) && (this.buffer += "\n\n",
                    this.parse()),
                    "INITIAL" === this.state)
                        throw new Error("Malformed WebVTT signature.")
                } catch (t) {
                    throw t
                }
                return this.onflush && this.onflush(),
                this
            }
        },
        e.default = n
    }
    , function(t, e, r) {
        "use strict";
        var i = this && this.__extends || function() {
            var t = Object.setPrototypeOf || {
                __proto__: []
            }instanceof Array && function(t, e) {
                t.__proto__ = e
            }
            || function(t, e) {
                for (var r in e)
                    e.hasOwnProperty(r) && (t[r] = e[r])
            }
            ;
            return function(e, r) {
                function i() {
                    this.constructor = e
                }
                t(e, r),
                e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                new i)
            }
        }();
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var a = r(6)
          , n = r(2)
          , o = r(16)
          , s = r(33)
          , l = r(34)
          , u = r(12)
          , d = r(35)
          , c = r(53)
          , f = r(54)
          , h = r(55)
          , p = r(0)
          , g = r(56)
          , v = r(1)
          , y = function(t) {
            function e(r) {
                void 0 === r && (r = {});
                var i = t.call(this) || this
                  , a = e.DefaultConfig;
                if ((r.liveSyncDurationCount || r.liveMaxLatencyDurationCount) && (r.liveSyncDuration || r.liveMaxLatencyDuration))
                    throw new Error("Illegal hls.js config: don't mix up liveSyncDurationCount/liveMaxLatencyDurationCount and liveSyncDuration/liveMaxLatencyDuration");
                for (var n in a)
                    n in r || (r[n] = a[n]);
                if (void 0 !== r.liveMaxLatencyDurationCount && r.liveMaxLatencyDurationCount <= r.liveSyncDurationCount)
                    throw new Error('Illegal hls.js config: "liveMaxLatencyDurationCount" must be gt "liveSyncDurationCount"');
                if (void 0 !== r.liveMaxLatencyDuration && (r.liveMaxLatencyDuration <= r.liveSyncDuration || void 0 === r.liveSyncDuration))
                    throw new Error('Illegal hls.js config: "liveMaxLatencyDuration" must be gt "liveSyncDuration"');
                p.enableLogs(r.debug),
                i.config = r,
                i._autoLevelCapping = -1;
                var h = i.abrController = new r.abrController(i)
                  , g = new r.bufferController(i)
                  , v = new r.capLevelController(i)
                  , y = new r.fpsController(i)
                  , m = new o.default(i)
                  , _ = new s.default(i)
                  , E = new l.default(i)
                  , T = new f.default(i)
                  , S = i.levelController = new c.default(i)
                  , b = new u.FragmentTracker(i)
                  , A = [S, i.streamController = new d.default(i,b)]
                  , R = r.audioStreamController;
                R && A.push(new R(i,b)),
                i.networkControllers = A;
                var D = [m, _, E, h, g, v, y, T, b];
                if (R = r.audioTrackController) {
                    var L = new R(i);
                    i.audioTrackController = L,
                    D.push(L)
                }
                if (R = r.subtitleTrackController) {
                    var w = new R(i);
                    i.subtitleTrackController = w,
                    D.push(w)
                }
                if (R = r.emeController) {
                    var k = new R(i);
                    i.emeController = k,
                    D.push(k)
                }
                return [r.subtitleStreamController, r.timelineController].forEach(function(t) {
                    t && D.push(new t(i))
                }),
                i.coreComponents = D,
                i
            }
            return i(e, t),
            Object.defineProperty(e, "version", {
                get: function() {
                    return "0.1.0-SNAPSHOT-undefined"
                },
                enumerable: !0,
                configurable: !0
            }),
            e.isSupported = function() {
                return h.isSupported()
            }
            ,
            Object.defineProperty(e, "Events", {
                get: function() {
                    return v.default
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e, "ErrorTypes", {
                get: function() {
                    return n.ErrorTypes
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e, "ErrorDetails", {
                get: function() {
                    return n.ErrorDetails
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e, "DefaultConfig", {
                get: function() {
                    return e.defaultConfig ? e.defaultConfig : g.hlsDefaultConfig
                },
                set: function(t) {
                    e.defaultConfig = t
                },
                enumerable: !0,
                configurable: !0
            }),
            e.prototype.destroy = function() {
                p.logger.log("destroy"),
                this.trigger(v.default.DESTROYING),
                this.detachMedia(),
                this.coreComponents.concat(this.networkControllers).forEach(function(t) {
                    t.destroy()
                }),
                this.url = null,
                this.removeAllListeners(),
                this._autoLevelCapping = -1
            }
            ,
            e.prototype.attachMedia = function(t) {
                p.logger.log("attachMedia"),
                this.media = t,
                this.trigger(v.default.MEDIA_ATTACHING, {
                    media: t
                })
            }
            ,
            e.prototype.detachMedia = function() {
                p.logger.log("detachMedia"),
                this.trigger(v.default.MEDIA_DETACHING),
                this.media = null
            }
            ,
            e.prototype.loadSource = function(t, e, r, i, n) {
                t = a.buildAbsoluteURL(window.location.href, t, {
                    alwaysNormalize: !0
                }),
                p.logger.log("loadSource:" + t),
                this.url = t,
                this.cid = e,
                this.lid = r,
                this.sign = i,
                this.part = n,
                this.trigger(v.default.MANIFEST_LOADING, {
                    url: t
                })
            }
            ,
            e.prototype.startLoad = function(t) {
                void 0 === t && (t = -1),
                p.logger.log("startLoad(" + t + ")"),
                this.networkControllers.forEach(function(e) {
                    e.startLoad(t)
                })
            }
            ,
            e.prototype.stopLoad = function() {
                p.logger.log("stopLoad"),
                this.networkControllers.forEach(function(t) {
                    t.stopLoad()
                })
            }
            ,
            e.prototype.swapAudioCodec = function() {
                p.logger.log("swapAudioCodec"),
                this.streamController.swapAudioCodec()
            }
            ,
            e.prototype.recoverMediaError = function() {
                p.logger.log("recoverMediaError");
                var t = this.media;
                this.detachMedia(),
                this.attachMedia(t)
            }
            ,
            Object.defineProperty(e.prototype, "levels", {
                get: function() {
                    return this.levelController.levels
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "currentLevel", {
                get: function() {
                    return this.streamController.currentLevel
                },
                set: function(t) {
                    p.logger.log("set currentLevel:" + t),
                    this.loadLevel = t,
                    this.streamController.immediateLevelSwitch()
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "nextLevel", {
                get: function() {
                    return this.streamController.nextLevel
                },
                set: function(t) {
                    p.logger.log("set nextLevel:" + t),
                    this.levelController.manualLevel = t,
                    this.streamController.nextLevelSwitch()
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "loadLevel", {
                get: function() {
                    return this.levelController.level
                },
                set: function(t) {
                    p.logger.log("set loadLevel:" + t),
                    this.levelController.manualLevel = t
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "nextLoadLevel", {
                get: function() {
                    return this.levelController.nextLoadLevel
                },
                set: function(t) {
                    this.levelController.nextLoadLevel = t
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "firstLevel", {
                get: function() {
                    return Math.max(this.levelController.firstLevel, this.minAutoLevel)
                },
                set: function(t) {
                    p.logger.log("set firstLevel:" + t),
                    this.levelController.firstLevel = t
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "startLevel", {
                get: function() {
                    return this.levelController.startLevel
                },
                set: function(t) {
                    p.logger.log("set startLevel:" + t);
                    -1 !== t && (t = Math.max(t, this.minAutoLevel)),
                    this.levelController.startLevel = t
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "autoLevelCapping", {
                get: function() {
                    return this._autoLevelCapping
                },
                set: function(t) {
                    p.logger.log("set autoLevelCapping:" + t),
                    this._autoLevelCapping = t
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "autoLevelEnabled", {
                get: function() {
                    return -1 === this.levelController.manualLevel
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "manualLevel", {
                get: function() {
                    return this.levelController.manualLevel
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "minAutoLevel", {
                get: function() {
                    for (var t = this.levels, e = this.config.minAutoBitrate, r = t ? t.length : 0, i = 0; i < r; i++) {
                        if ((t[i].realBitrate ? Math.max(t[i].realBitrate, t[i].bitrate) : t[i].bitrate) > e)
                            return i
                    }
                    return 0
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "maxAutoLevel", {
                get: function() {
                    var t = this.levels
                      , e = this.autoLevelCapping;
                    return -1 === e && t && t.length ? t.length - 1 : e
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "nextAutoLevel", {
                get: function() {
                    return Math.min(Math.max(this.abrController.nextAutoLevel, this.minAutoLevel), this.maxAutoLevel)
                },
                set: function(t) {
                    this.abrController.nextAutoLevel = Math.max(this.minAutoLevel, t)
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "audioTracks", {
                get: function() {
                    var t = this.audioTrackController;
                    return t ? t.audioTracks : []
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "audioTrack", {
                get: function() {
                    var t = this.audioTrackController;
                    return t ? t.audioTrack : -1
                },
                set: function(t) {
                    var e = this.audioTrackController;
                    e && (e.audioTrack = t)
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "liveSyncPosition", {
                get: function() {
                    return this.streamController.liveSyncPosition
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "subtitleTracks", {
                get: function() {
                    var t = this.subtitleTrackController;
                    return t ? t.subtitleTracks : []
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "subtitleTrack", {
                get: function() {
                    var t = this.subtitleTrackController;
                    return t ? t.subtitleTrack : -1
                },
                set: function(t) {
                    var e = this.subtitleTrackController;
                    e && (e.subtitleTrack = t)
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "subtitleDisplay", {
                get: function() {
                    var t = this.subtitleTrackController;
                    return !!t && t.subtitleDisplay
                },
                set: function(t) {
                    var e = this.subtitleTrackController;
                    e && (e.subtitleDisplay = t)
                },
                enumerable: !0,
                configurable: !0
            }),
            e
        }(r(24).Observer);
        e.default = y
    }
    , function(t, e, r) {
        "use strict";
        (function(t) {
            Object.defineProperty(e, "__esModule", {
                value: !0
            });
            var i = r(6)
              , a = r(11)
              , n = r(31)
              , o = r(18)
              , s = r(32)
              , l = r(0)
              , u = r(19)
              , d = /#EXT-X-STREAM-INF:([^\n\r]*)[\r\n]+([^\r\n]+)/g
              , c = /#EXT-X-MEDIA:(.*)/g
              , f = new RegExp([/#EXTINF:\s*(\d*(?:\.\d+)?)(?:,(.*)\s+)?/.source, /|(?!#)([\S+ ?]+)/.source, /|#EXT-X-BYTERANGE:*(.+)/.source, /|#EXT-X-PROGRAM-DATE-TIME:(.+)/.source, /|#.*/.source].join(""),"g")
              , h = /(?:(?:#(EXTM3U))|(?:#EXT-X-(PLAYLIST-TYPE):(.+))|(?:#EXT-X-(MEDIA-SEQUENCE): *(\d+))|(?:#EXT-X-(TARGETDURATION): *(\d+))|(?:#EXT-X-(KEY):(.+))|(?:#EXT-X-(START):(.+))|(?:#EXT-X-(ENDLIST))|(?:#EXT-X-(DISCONTINUITY-SEQ)UENCE:(\d+))|(?:#EXT-X-(DIS)CONTINUITY))|(?:#EXT-X-(VERSION):(\d+))|(?:#EXT-X-(MAP):(.+))|(?:(#)([^:]*):(.*))|(?:(#)(.*))(?:.*)\r?\n?/
              , p = /\.(mp4|m4s|m4v|m4a)$/i
              , g = function() {
                function e() {}
                return e.findGroup = function(t, e) {
                    if (!t)
                        return null;
                    for (var r = null, i = 0; i < t.length; i++) {
                        var a = t[i];
                        a.id === e && (r = a)
                    }
                    return r
                }
                ,
                e.convertAVC1ToAVCOTI = function(t) {
                    var e, r = t.split(".");
                    return r.length > 2 ? (e = r.shift() + ".",
                    e += parseInt(r.shift()).toString(16),
                    e += ("000" + parseInt(r.shift()).toString(16)).substr(-4)) : e = t,
                    e
                }
                ,
                e.resolve = function(t, e) {
                    return i.buildAbsoluteURL(e, t, {
                        alwaysNormalize: !0
                    })
                }
                ,
                e.parseMasterPlaylist = function(t, r) {
                    var i, a = [];
                    function n(t, e) {
                        ["video", "audio"].forEach(function(r) {
                            var i = t.filter(function(t) {
                                return u.isCodecType(t, r)
                            });
                            if (i.length) {
                                var a = i.filter(function(t) {
                                    return 0 === t.lastIndexOf("avc1", 0) || 0 === t.lastIndexOf("mp4a", 0)
                                });
                                e[r + "Codec"] = a.length > 0 ? a[0] : i[0],
                                t = t.filter(function(t) {
                                    return -1 === i.indexOf(t)
                                })
                            }
                        }),
                        e.unknownCodecs = t
                    }
                    for (d.lastIndex = 0; null != (i = d.exec(t)); ) {
                        var o = {}
                          , l = o.attrs = new s.default(i[1]);
                        o.url = e.resolve(i[2], r);
                        var c = l.decimalResolution("RESOLUTION");
                        c && (o.width = c.width,
                        o.height = c.height),
                        o.bitrate = l.decimalInteger("AVERAGE-BANDWIDTH") || l.decimalInteger("BANDWIDTH"),
                        o.name = l.NAME,
                        n([].concat((l.CODECS || "").split(/[ ,]+/)), o),
                        o.videoCodec && -1 !== o.videoCodec.indexOf("avc1") && (o.videoCodec = e.convertAVC1ToAVCOTI(o.videoCodec)),
                        a.push(o)
                    }
                    return a
                }
                ,
                e.parseMasterPlaylistMedia = function(t, r, i, a) {
                    var n;
                    void 0 === a && (a = []);
                    var o = []
                      , l = 0;
                    for (c.lastIndex = 0; null !== (n = c.exec(t)); ) {
                        var u = {}
                          , d = new s.default(n[1]);
                        if (d.TYPE === i) {
                            if (u.groupId = d["GROUP-ID"],
                            u.name = d.NAME,
                            u.type = i,
                            u.default = "YES" === d.DEFAULT,
                            u.autoselect = "YES" === d.AUTOSELECT,
                            u.forced = "YES" === d.FORCED,
                            d.URI && (u.url = e.resolve(d.URI, r)),
                            u.lang = d.LANGUAGE,
                            u.name || (u.name = u.lang),
                            a.length) {
                                var f = e.findGroup(a, u.groupId);
                                u.audioCodec = f ? f.codec : a[0].codec
                            }
                            u.id = l++,
                            o.push(u)
                        }
                    }
                    return o
                }
                ,
                e.parseLevelPlaylist = function(e, r, i, u, d) {
                    var c, g, y = 0, m = 0, _ = new n.default(r), E = new o.default, T = 0, S = null, b = new a.default, A = null;
                    for (f.lastIndex = 0; null !== (c = f.exec(e)); ) {
                        var R = c[1];
                        if (R) {
                            b.duration = parseFloat(R);
                            var D = (" " + c[2]).slice(1);
                            b.title = D || null,
                            b.tagList.push(D ? ["INF", R, D] : ["INF", R])
                        } else if (c[3]) {
                            if (t.isFinite(b.duration)) {
                                var L = y++;
                                b.type = u,
                                b.start = m,
                                b.levelkey = E,
                                b.sn = L,
                                b.level = i,
                                b.cc = T,
                                b.urlId = d,
                                b.baseurl = r,
                                b.relurl = (" " + c[3]).slice(1),
                                v(b, S),
                                _.fragments.push(b),
                                S = b,
                                m += b.duration,
                                b = new a.default
                            }
                        } else if (c[4]) {
                            if (b.rawByteRange = (" " + c[4]).slice(1),
                            S) {
                                var w = S.byteRangeEndOffset;
                                w && (b.lastByteRangeEndOffset = w)
                            }
                        } else if (c[5])
                            b.rawProgramDateTime = (" " + c[5]).slice(1),
                            b.tagList.push(["PROGRAM-DATE-TIME", b.rawProgramDateTime]),
                            null === A && (A = _.fragments.length);
                        else {
                            for (c = c[0].match(h),
                            g = 1; g < c.length && void 0 === c[g]; g++)
                                ;
                            var k = (" " + c[g + 1]).slice(1)
                              , O = (" " + c[g + 2]).slice(1);
                            switch (c[g]) {
                            case "#":
                                b.tagList.push(O ? [k, O] : [k]);
                                break;
                            case "PLAYLIST-TYPE":
                                _.type = k.toUpperCase();
                                break;
                            case "MEDIA-SEQUENCE":
                                y = _.startSN = parseInt(k);
                                break;
                            case "TARGETDURATION":
                                _.targetduration = parseFloat(k);
                                break;
                            case "VERSION":
                                _.version = parseInt(k);
                                break;
                            case "EXTM3U":
                                break;
                            case "ENDLIST":
                                _.live = !1;
                                break;
                            case "DIS":
                                T++,
                                b.tagList.push(["DIS"]);
                                break;
                            case "DISCONTINUITY-SEQ":
                                T = parseInt(k);
                                break;
                            case "KEY":
                                var I = k
                                  , P = new s.default(I)
                                  , C = P.enumeratedString("METHOD")
                                  , x = P.URI
                                  , F = P.hexadecimalInteger("IV");
                                C && (E = new o.default,
                                x && ["AES-128", "SAMPLE-AES", "SAMPLE-AES-CENC"].indexOf(C) >= 0 && (E.method = C,
                                E.baseuri = r,
                                E.reluri = x,
                                E.key = null,
                                E.iv = F));
                                break;
                            case "START":
                                var M = k
                                  , B = new s.default(M).decimalFloatingPoint("TIME-OFFSET");
                                t.isFinite(B) && (_.startTimeOffset = B);
                                break;
                            case "MAP":
                                var N = new s.default(k);
                                b.relurl = N.URI,
                                b.rawByteRange = N.BYTERANGE,
                                b.baseurl = r,
                                b.level = i,
                                b.type = u,
                                b.sn = "initSegment",
                                _.initSegment = b,
                                (b = new a.default).rawProgramDateTime = _.initSegment.rawProgramDateTime;
                                break;
                            default:
                                l.logger.warn("line parsed but not handled: " + c)
                            }
                        }
                    }
                    return (b = S) && !b.relurl && (_.fragments.pop(),
                    m -= b.duration),
                    _.totalduration = m,
                    _.averagetargetduration = m / _.fragments.length,
                    _.endSN = y - 1,
                    _.startCC = _.fragments[0] ? _.fragments[0].cc : 0,
                    _.endCC = T,
                    !_.initSegment && _.fragments.length && _.fragments.every(function(t) {
                        return p.test(t.relurl)
                    }) && (l.logger.warn("MP4 fragments found but no init segment (probably no MAP, incomplete M3U8), trying to fetch SIDX"),
                    (b = new a.default).relurl = _.fragments[0].relurl,
                    b.baseurl = r,
                    b.level = i,
                    b.type = u,
                    b.sn = "initSegment",
                    _.initSegment = b,
                    _.needSidxRanges = !0),
                    A && function(t, e) {
                        for (var r = t[e], i = e - 1; i >= 0; i--) {
                            var a = t[i];
                            a.programDateTime = r.programDateTime - 1e3 * a.duration,
                            r = a
                        }
                    }(_.fragments, A),
                    _
                }
                ,
                e
            }();
            function v(e, r) {
                e.rawProgramDateTime ? e.programDateTime = Date.parse(e.rawProgramDateTime) : r && r.programDateTime && (e.programDateTime = r.endProgramDateTime),
                t.isFinite(e.programDateTime) || (e.programDateTime = null,
                e.rawProgramDateTime = null)
            }
            e.default = g
        }
        ).call(this, r(3).Number)
    }
    , function(t, e, r) {
        "use strict";
        (function(t) {
            Object.defineProperty(e, "__esModule", {
                value: !0
            });
            var r = function() {
                function e(t) {
                    this.endCC = 0,
                    this.endSN = 0,
                    this.fragments = [],
                    this.initSegment = null,
                    this.live = !0,
                    this.needSidxRanges = !1,
                    this.startCC = 0,
                    this.startSN = 0,
                    this.startTimeOffset = null,
                    this.targetduration = 0,
                    this.totalduration = 0,
                    this.type = null,
                    this.url = t,
                    this.version = null
                }
                return Object.defineProperty(e.prototype, "hasProgramDateTime", {
                    get: function() {
                        return !(!this.fragments[0] || !t.isFinite(this.fragments[0].programDateTime))
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                e
            }();
            e.default = r
        }
        ).call(this, r(3).Number)
    }
    , function(t, e, r) {
        "use strict";
        (function(t) {
            Object.defineProperty(e, "__esModule", {
                value: !0
            });
            var r = /^(\d+)x(\d+)$/
              , i = /\s*(.+?)\s*=((?:\".*?\")|.*?)(?:,|$)/g
              , a = function() {
                function e(t) {
                    for (var r in "string" == typeof t && (t = e.parseAttrList(t)),
                    t)
                        t.hasOwnProperty(r) && (this[r] = t[r])
                }
                return e.prototype.decimalInteger = function(e) {
                    var r = parseInt(this[e], 10);
                    return r > t.MAX_SAFE_INTEGER ? 1 / 0 : r
                }
                ,
                e.prototype.hexadecimalInteger = function(t) {
                    if (this[t]) {
                        var e = (this[t] || "0x").slice(2);
                        e = (1 & e.length ? "0" : "") + e;
                        for (var r = new Uint8Array(e.length / 2), i = 0; i < e.length / 2; i++)
                            r[i] = parseInt(e.slice(2 * i, 2 * i + 2), 16);
                        return r
                    }
                    return null
                }
                ,
                e.prototype.hexadecimalIntegerAsNumber = function(e) {
                    var r = parseInt(this[e], 16);
                    return r > t.MAX_SAFE_INTEGER ? 1 / 0 : r
                }
                ,
                e.prototype.decimalFloatingPoint = function(t) {
                    return parseFloat(this[t])
                }
                ,
                e.prototype.enumeratedString = function(t) {
                    return this[t]
                }
                ,
                e.prototype.decimalResolution = function(t) {
                    var e = r.exec(this[t]);
                    if (null !== e)
                        return {
                            width: parseInt(e[1], 10),
                            height: parseInt(e[2], 10)
                        }
                }
                ,
                e.parseAttrList = function(t) {
                    var e, r = {};
                    for (i.lastIndex = 0; null !== (e = i.exec(t)); ) {
                        var a = e[2];
                        0 === a.indexOf('"') && a.lastIndexOf('"') === a.length - 1 && (a = a.slice(1, -1)),
                        r[e[1]] = a
                    }
                    return r
                }
                ,
                e
            }();
            e.default = a
        }
        ).call(this, r(3).Number)
    }
    , function(t, e, r) {
        "use strict";
        (function(t) {
            var i = this && this.__extends || function() {
                var t = Object.setPrototypeOf || {
                    __proto__: []
                }instanceof Array && function(t, e) {
                    t.__proto__ = e
                }
                || function(t, e) {
                    for (var r in e)
                        e.hasOwnProperty(r) && (t[r] = e[r])
                }
                ;
                return function(e, r) {
                    function i() {
                        this.constructor = e
                    }
                    t(e, r),
                    e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                    new i)
                }
            }();
            Object.defineProperty(e, "__esModule", {
                value: !0
            });
            var a = r(1)
              , n = r(4)
              , o = r(2)
              , s = r(0)
              , l = function(e) {
                function r(t) {
                    var r = e.call(this, t, a.default.FRAG_LOADING) || this;
                    return r.loaders = {},
                    r
                }
                return i(r, e),
                r.prototype.destroy = function() {
                    var t = this.loaders;
                    for (var r in t) {
                        var i = t[r];
                        i && i.destroy()
                    }
                    this.loaders = {},
                    e.prototype.destroy.call(this)
                }
                ,
                r.prototype.onFragLoading = function(e) {
                    var r = e.frag
                      , i = r.type
                      , a = this.loaders
                      , n = this.hls.config
                      , o = n.fLoader
                      , l = n.loader;
                    r.loaded = 0;
                    var u, d, c, f = a[i];
                    f && (s.logger.warn("abort previous fragment loader for type: " + i),
                    f.abort()),
                    f = a[i] = r.loader = n.fLoader ? new o(n) : new l(n),
                    u = {
                        url: r.url,
                        frag: r,
                        responseType: "arraybuffer",
                        progressData: !1
                    };
                    var h = r.byteRangeStartOffset
                      , p = r.byteRangeEndOffset;
                    t.isFinite(h) && t.isFinite(p) && (u.rangeStart = h,
                    u.rangeEnd = p),
                    d = {
                        timeout: n.fragLoadingTimeOut,
                        maxRetry: 0,
                        retryDelay: 0,
                        maxRetryDelay: n.fragLoadingMaxRetryTimeout
                    },
                    c = {
                        onSuccess: this.loadsuccess.bind(this),
                        onError: this.loaderror.bind(this),
                        onTimeout: this.loadtimeout.bind(this),
                        onProgress: this.loadprogress.bind(this)
                    },
                    f.load(u, d, c)
                }
                ,
                r.prototype.loadsuccess = function(t, e, r, i) {
                    void 0 === i && (i = null);
                    var n = t.data
                      , o = r.frag;
                    o.loader = void 0,
                    this.loaders[o.type] = void 0,
                    this.hls.trigger(a.default.FRAG_LOADED, {
                        payload: n,
                        frag: o,
                        stats: e,
                        networkDetails: i,
                        url: r.url
                    })
                }
                ,
                r.prototype.loaderror = function(t, e, r) {
                    void 0 === r && (r = null);
                    var i = e.frag
                      , n = i.loader;
                    n && n.abort(),
                    this.loaders[i.type] = void 0,
                    this.hls.trigger(a.default.ERROR, {
                        type: o.ErrorTypes.NETWORK_ERROR,
                        details: o.ErrorDetails.FRAG_LOAD_ERROR,
                        fatal: !1,
                        frag: e.frag,
                        response: t,
                        networkDetails: r
                    })
                }
                ,
                r.prototype.loadtimeout = function(t, e, r) {
                    void 0 === r && (r = null);
                    var i = e.frag
                      , n = i.loader;
                    n && n.abort(),
                    this.loaders[i.type] = void 0,
                    this.hls.trigger(a.default.ERROR, {
                        type: o.ErrorTypes.NETWORK_ERROR,
                        details: o.ErrorDetails.FRAG_LOAD_TIMEOUT,
                        fatal: !1,
                        frag: e.frag,
                        networkDetails: r
                    })
                }
                ,
                r.prototype.loadprogress = function(t, e, r, i) {
                    void 0 === i && (i = null);
                    var n = e.frag;
                    n.loaded = t.loaded,
                    this.hls.trigger(a.default.FRAG_LOAD_PROGRESS, {
                        frag: n,
                        stats: t,
                        networkDetails: i
                    })
                }
                ,
                r
            }(n.default);
            e.default = l
        }
        ).call(this, r(3).Number)
    }
    , function(t, e, r) {
        "use strict";
        var i = this && this.__extends || function() {
            var t = Object.setPrototypeOf || {
                __proto__: []
            }instanceof Array && function(t, e) {
                t.__proto__ = e
            }
            || function(t, e) {
                for (var r in e)
                    e.hasOwnProperty(r) && (t[r] = e[r])
            }
            ;
            return function(e, r) {
                function i() {
                    this.constructor = e
                }
                t(e, r),
                e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                new i)
            }
        }();
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var a = r(1)
          , n = r(4)
          , o = r(2)
          , s = r(0)
          , l = function(t) {
            function e(e) {
                var r = t.call(this, e, a.default.KEY_LOADING) || this;
                return r.loaders = {},
                r.decryptkey = null,
                r.decrypturl = null,
                r
            }
            return i(e, t),
            e.prototype.destroy = function() {
                for (var t in this.loaders) {
                    var e = this.loaders[t];
                    e && e.destroy()
                }
                this.loaders = {},
                n.default.prototype.destroy.call(this)
            }
            ,
            e.prototype.onKeyLoading = function(t) {
                var e = t.frag
                  , r = e.type
                  , i = this.loaders[r]
                  , n = e.decryptdata
                  , o = n.uri;
                if (o !== this.decrypturl || null === this.decryptkey) {
                    var l = this.hls.config;
                    i && (s.logger.warn("abort previous key loader for type:" + r),
                    i.abort()),
                    e.loader = this.loaders[r] = new l.loader(l),
                    this.decrypturl = o,
                    this.decryptkey = null;
                    var u, d, c;
                    u = {
                        url: o + "&sign=" + this.hls.sign,
                        frag: e,
                        responseType: "arraybuffer"
                    },
                    d = {
                        timeout: l.fragLoadingTimeOut,
                        maxRetry: 0,
                        retryDelay: l.fragLoadingRetryDelay,
                        maxRetryDelay: l.fragLoadingMaxRetryTimeout
                    },
                    c = {
                        onSuccess: this.loadsuccess.bind(this),
                        onError: this.loaderror.bind(this),
                        onTimeout: this.loadtimeout.bind(this)
                    },
                    e.loader.load(u, d, c)
                } else
                    this.decryptkey && (n.key = this.decryptkey,
                    this.hls.trigger(a.default.KEY_LOADED, {
                        frag: e
                    }))
            }
            ,
            e.prototype.loadsuccess = function(t, e, r) {
                var i = r.frag;
                this.decryptkey = i.decryptdata.key = t.data,
                i.decryptdata._cid = this.hls.cid,
                i.decryptdata._lid = this.hls.lid,
                i.decryptdata.part = this.hls.part,
                i.loader = void 0,
                this.loaders[i.type] = void 0,
                this.hls.trigger(a.default.KEY_LOADED, {
                    frag: i
                })
            }
            ,
            e.prototype.loaderror = function(t, e) {
                var r = e.frag
                  , i = r.loader;
                i && i.abort(),
                this.loaders[e.type] = void 0,
                this.hls.trigger(a.default.ERROR, {
                    type: o.ErrorTypes.NETWORK_ERROR,
                    details: o.ErrorDetails.KEY_LOAD_ERROR,
                    fatal: !1,
                    frag: r,
                    response: t
                })
            }
            ,
            e.prototype.loadtimeout = function(t, e) {
                var r = e.frag
                  , i = r.loader;
                i && i.abort(),
                this.loaders[e.type] = void 0,
                this.hls.trigger(a.default.ERROR, {
                    type: o.ErrorTypes.NETWORK_ERROR,
                    details: o.ErrorDetails.KEY_LOAD_TIMEOUT,
                    fatal: !1,
                    frag: r
                })
            }
            ,
            e
        }(n.default);
        e.default = l
    }
    , function(t, e, r) {
        "use strict";
        (function(t) {
            var i = this && this.__extends || function() {
                var t = Object.setPrototypeOf || {
                    __proto__: []
                }instanceof Array && function(t, e) {
                    t.__proto__ = e
                }
                || function(t, e) {
                    for (var r in e)
                        e.hasOwnProperty(r) && (t[r] = e[r])
                }
                ;
                return function(e, r) {
                    function i() {
                        this.constructor = e
                    }
                    t(e, r),
                    e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                    new i)
                }
            }();
            Object.defineProperty(e, "__esModule", {
                value: !0
            });
            var a = r(7)
              , n = r(8)
              , o = r(20)
              , s = r(1)
              , l = r(12)
              , u = r(11)
              , d = r(16)
              , c = r(15)
              , f = r(25)
              , h = r(2)
              , p = r(0)
              , g = r(26)
              , v = r(10)
              , y = r(51)
              , m = r(52);
            e.State = {
                STOPPED: "STOPPED",
                IDLE: "IDLE",
                KEY_LOADING: "KEY_LOADING",
                FRAG_LOADING: "FRAG_LOADING",
                FRAG_LOADING_WAITING_RETRY: "FRAG_LOADING_WAITING_RETRY",
                WAITING_LEVEL: "WAITING_LEVEL",
                PARSING: "PARSING",
                PARSED: "PARSED",
                BUFFER_FLUSHING: "BUFFER_FLUSHING",
                ENDED: "ENDED",
                ERROR: "ERROR"
            };
            var _ = function(r) {
                function v(t, i) {
                    var a = r.call(this, t, s.default.MEDIA_ATTACHED, s.default.MEDIA_DETACHING, s.default.MANIFEST_LOADING, s.default.MANIFEST_PARSED, s.default.LEVEL_LOADED, s.default.KEY_LOADED, s.default.FRAG_LOADED, s.default.FRAG_LOAD_EMERGENCY_ABORTED, s.default.FRAG_PARSING_INIT_SEGMENT, s.default.FRAG_PARSING_DATA, s.default.FRAG_PARSED, s.default.ERROR, s.default.AUDIO_TRACK_SWITCHING, s.default.AUDIO_TRACK_SWITCHED, s.default.BUFFER_CREATED, s.default.BUFFER_APPENDED, s.default.BUFFER_FLUSHED) || this;
                    return a.fragmentTracker = i,
                    a.config = t.config,
                    a.audioCodecSwap = !1,
                    a._state = e.State.STOPPED,
                    a.stallReported = !1,
                    a.gapController = null,
                    a
                }
                return i(v, r),
                v.prototype.onHandlerDestroying = function() {
                    this.stopLoad(),
                    r.prototype.onHandlerDestroying.call(this)
                }
                ,
                v.prototype.onHandlerDestroyed = function() {
                    this.state = e.State.STOPPED,
                    this.fragmentTracker = null,
                    r.prototype.onHandlerDestroyed.call(this)
                }
                ,
                v.prototype.startLoad = function(t) {
                    if (this.levels) {
                        var r = this.lastCurrentTime
                          , i = this.hls;
                        if (this.stopLoad(),
                        this.setInterval(100),
                        this.level = -1,
                        this.fragLoadError = 0,
                        !this.startFragRequested) {
                            var a = i.startLevel;
                            -1 === a && (a = 0,
                            this.bitrateTest = !0),
                            this.level = i.nextLoadLevel = a,
                            this.loadedmetadata = !1
                        }
                        r > 0 && -1 === t && (p.logger.log("override startPosition with lastCurrentTime @" + r.toFixed(3)),
                        t = r),
                        this.state = e.State.IDLE,
                        this.nextLoadPosition = this.startPosition = this.lastCurrentTime = t,
                        this.tick()
                    } else
                        this.forceStartLoad = !0,
                        this.state = e.State.STOPPED
                }
                ,
                v.prototype.stopLoad = function() {
                    var t = this.fragCurrent;
                    t && (t.loader && t.loader.abort(),
                    this.fragmentTracker.removeFragment(t),
                    this.fragCurrent = null),
                    this.fragPrevious = null,
                    this.demuxer && (this.demuxer.destroy(),
                    this.demuxer = null),
                    this.clearInterval(),
                    this.state = e.State.STOPPED,
                    this.forceStartLoad = !1
                }
                ,
                v.prototype.doTick = function() {
                    switch (this.state) {
                    case e.State.BUFFER_FLUSHING:
                        this.fragLoadError = 0;
                        break;
                    case e.State.IDLE:
                        this._doTickIdle();
                        break;
                    case e.State.WAITING_LEVEL:
                        var t = this.levels[this.level];
                        t && t.details && (this.state = e.State.IDLE);
                        break;
                    case e.State.FRAG_LOADING_WAITING_RETRY:
                        var r = window.performance.now()
                          , i = this.retryDate;
                        (!i || r >= i || this.media && this.media.seeking) && (p.logger.log("mediaController: retryDate reached, switch back to IDLE state"),
                        this.state = e.State.IDLE);
                        break;
                    case e.State.ERROR:
                    case e.State.STOPPED:
                    case e.State.FRAG_LOADING:
                    case e.State.PARSING:
                    case e.State.PARSED:
                    case e.State.ENDED:
                    }
                    this._checkBuffer(),
                    this._checkFragmentChanged()
                }
                ,
                v.prototype._doTickIdle = function() {
                    var t = this.hls
                      , r = t.config
                      , i = this.media;
                    if (void 0 !== this.levelLastLoaded && (i || !this.startFragRequested && r.startFragPrefetch)) {
                        var a;
                        a = this.loadedmetadata ? i.currentTime : this.nextLoadPosition;
                        var o = t.nextLoadLevel
                          , l = this.levels[o];
                        if (l) {
                            var u, d = l.bitrate;
                            u = d ? Math.max(8 * r.maxBufferSize / d, r.maxBufferLength) : r.maxBufferLength,
                            u = Math.min(u, r.maxMaxBufferLength);
                            var c = n.BufferHelper.bufferInfo(this.mediaBuffer ? this.mediaBuffer : i, a, r.maxBufferHole)
                              , f = c.len;
                            if (!(f >= u)) {
                                p.logger.trace("buffer length of " + f.toFixed(3) + " is below max of " + u.toFixed(3) + ". checking for more payload ..."),
                                this.level = t.nextLoadLevel = o;
                                var h = l.details;
                                if (!h || h.live && this.levelLastLoaded !== o)
                                    this.state = e.State.WAITING_LEVEL;
                                else {
                                    var g = this.fragPrevious;
                                    if (!h.live && g && !g.backtracked && g.sn === h.endSN && !c.nextStart)
                                        if (Math.min(i.duration, g.start + g.duration) - Math.max(c.end, g.start) <= Math.max(.2, g.duration)) {
                                            var v = {};
                                            return this.altAudio && (v.type = "video"),
                                            this.hls.trigger(s.default.BUFFER_EOS, v),
                                            void (this.state = e.State.ENDED)
                                        }
                                    this._fetchPayloadOrEos(a, c, h)
                                }
                            }
                        }
                    }
                }
                ,
                v.prototype._fetchPayloadOrEos = function(t, e, r) {
                    var i = this.fragPrevious
                      , a = this.level
                      , n = r.fragments
                      , o = n.length;
                    if (0 !== o) {
                        var s, l = n[0].start, u = n[o - 1].start + n[o - 1].duration, d = e.end;
                        if (r.initSegment && !r.initSegment.data)
                            s = r.initSegment;
                        else if (r.live) {
                            var c = this.config.initialLiveManifestSize;
                            if (o < c)
                                return void p.logger.warn("Can not start playback of a level, reason: not enough fragments " + o + " < " + c);
                            if (null === (s = this._ensureFragmentAtLivePoint(r, d, l, u, i, n, o)))
                                return
                        } else
                            d < l && (s = n[0]);
                        s || (s = this._findFragment(l, i, o, n, d, u, r)),
                        s && (s.encrypted ? (p.logger.log("Loading key for " + s.sn + " of [" + r.startSN + " ," + r.endSN + "],level " + a),
                        this._loadKey(s)) : (p.logger.log("Loading " + s.sn + " of [" + r.startSN + " ," + r.endSN + "],level " + a + ", currentTime:" + t.toFixed(3) + ",bufferEnd:" + d.toFixed(3)),
                        this._loadFragment(s)))
                    }
                }
                ,
                v.prototype._ensureFragmentAtLivePoint = function(t, e, r, i, n, o, s) {
                    var l, u = this.hls.config, d = this.media, c = void 0 !== u.liveMaxLatencyDuration ? u.liveMaxLatencyDuration : u.liveMaxLatencyDurationCount * t.targetduration;
                    if (e < Math.max(r - u.maxFragLookUpTolerance, i - c)) {
                        var f = this.liveSyncPosition = this.computeLivePosition(r, t);
                        p.logger.log("buffer end: " + e.toFixed(3) + " is located too far from the end of live sliding playlist, reset currentTime to : " + f.toFixed(3)),
                        e = f,
                        d && d.readyState && d.duration > f && (d.currentTime = f),
                        this.nextLoadPosition = f
                    }
                    if (t.PTSKnown && e > i && d && d.readyState)
                        return null;
                    if (this.startFragRequested && !t.PTSKnown) {
                        if (n)
                            if (t.hasProgramDateTime)
                                p.logger.log("live playlist, switching playlist, load frag with same PDT: " + n.programDateTime),
                                l = y.findFragmentByPDT(o, n.endProgramDateTime, u.maxFragLookUpTolerance);
                            else {
                                var h = n.sn + 1;
                                if (h >= t.startSN && h <= t.endSN) {
                                    var g = o[h - t.startSN];
                                    n.cc === g.cc && (l = g,
                                    p.logger.log("live playlist, switching playlist, load frag with next SN: " + l.sn))
                                }
                                l || (l = a.default.search(o, function(t) {
                                    return n.cc - t.cc
                                })) && p.logger.log("live playlist, switching playlist, load frag with same CC: " + l.sn)
                            }
                        l || (l = o[Math.min(s - 1, Math.round(s / 2))],
                        p.logger.log("live playlist, switching playlist, unknown, load middle frag : " + l.sn))
                    }
                    return l
                }
                ,
                v.prototype._findFragment = function(t, e, r, i, a, n, o) {
                    var s, l = this.hls.config;
                    if (a < n) {
                        var u = a > n - l.maxFragLookUpTolerance ? 0 : l.maxFragLookUpTolerance;
                        s = y.findFragmentByPTS(e, i, a, u)
                    } else
                        s = i[r - 1];
                    if (s) {
                        var d = s.sn - o.startSN
                          , c = e && s.level === e.level
                          , f = i[d - 1]
                          , h = i[d + 1];
                        if (e && s.sn === e.sn)
                            if (c && !s.backtracked)
                                if (s.sn < o.endSN) {
                                    var g = e.deltaPTS;
                                    g && g > l.maxBufferHole && e.dropped && d ? (s = f,
                                    p.logger.warn("SN just loaded, with large PTS gap between audio and video, maybe frag is not starting with a keyframe ? load previous one to try to overcome this")) : (s = h,
                                    p.logger.log("SN just loaded, load next one: " + s.sn, s))
                                } else
                                    s = null;
                            else
                                s.backtracked && (h && h.backtracked ? (p.logger.warn("Already backtracked from fragment " + h.sn + ", will not backtrack to fragment " + s.sn + ". Loading fragment " + h.sn),
                                s = h) : (p.logger.warn("Loaded fragment with dropped frames, backtracking 1 segment to find a keyframe"),
                                s.dropped = 0,
                                f ? (s = f).backtracked = !0 : d && (s = null)))
                    }
                    return s
                }
                ,
                v.prototype._loadKey = function(t) {
                    this.state = e.State.KEY_LOADING,
                    this.hls.trigger(s.default.KEY_LOADING, {
                        frag: t
                    })
                }
                ,
                v.prototype._loadFragment = function(r) {
                    var i = this.fragmentTracker.getState(r);
                    this.fragCurrent = r,
                    this.startFragRequested = !0,
                    t.isFinite(r.sn) && !r.bitrateTest && (this.nextLoadPosition = r.start + r.duration),
                    r.backtracked || i === l.FragmentState.NOT_LOADED || i === l.FragmentState.PARTIAL ? (r.autoLevel = this.hls.autoLevelEnabled,
                    r.bitrateTest = this.bitrateTest,
                    this.hls.trigger(s.default.FRAG_LOADING, {
                        frag: r
                    }),
                    this.demuxer || (this.demuxer = new o.default(this.hls,"main")),
                    this.state = e.State.FRAG_LOADING) : i === l.FragmentState.APPENDING && this._reduceMaxBufferLength(r.duration) && this.fragmentTracker.removeFragment(r)
                }
                ,
                Object.defineProperty(v.prototype, "state", {
                    get: function() {
                        return this._state
                    },
                    set: function(t) {
                        if (this.state !== t) {
                            var e = this.state;
                            this._state = t,
                            p.logger.log("main stream:" + e + "->" + t),
                            this.hls.trigger(s.default.STREAM_STATE_TRANSITION, {
                                previousState: e,
                                nextState: t
                            })
                        }
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                v.prototype.getBufferedFrag = function(t) {
                    return this.fragmentTracker.getBufferedFrag(t, d.default.LevelType.MAIN)
                }
                ,
                Object.defineProperty(v.prototype, "currentLevel", {
                    get: function() {
                        var t = this.media;
                        if (t) {
                            var e = this.getBufferedFrag(t.currentTime);
                            if (e)
                                return e.level
                        }
                        return -1
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                Object.defineProperty(v.prototype, "nextBufferedFrag", {
                    get: function() {
                        var t = this.media;
                        return t ? this.followingBufferedFrag(this.getBufferedFrag(t.currentTime)) : null
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                v.prototype.followingBufferedFrag = function(t) {
                    return t ? this.getBufferedFrag(t.endPTS + .5) : null
                }
                ,
                Object.defineProperty(v.prototype, "nextLevel", {
                    get: function() {
                        var t = this.nextBufferedFrag;
                        return t ? t.level : -1
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                v.prototype._checkFragmentChanged = function() {
                    var t, e, r = this.media;
                    if (r && r.readyState && !1 === r.seeking && ((e = r.currentTime) > this.lastCurrentTime && (this.lastCurrentTime = e),
                    n.BufferHelper.isBuffered(r, e) ? t = this.getBufferedFrag(e) : n.BufferHelper.isBuffered(r, e + .1) && (t = this.getBufferedFrag(e + .1)),
                    t)) {
                        var i = t;
                        if (i !== this.fragPlaying) {
                            this.hls.trigger(s.default.FRAG_CHANGED, {
                                frag: i
                            });
                            var a = i.level;
                            this.fragPlaying && this.fragPlaying.level === a || this.hls.trigger(s.default.LEVEL_SWITCHED, {
                                level: a
                            }),
                            this.fragPlaying = i
                        }
                    }
                }
                ,
                v.prototype.immediateLevelSwitch = function() {
                    if (p.logger.log("immediateLevelSwitch"),
                    !this.immediateSwitch) {
                        this.immediateSwitch = !0;
                        var e = this.media
                          , r = void 0;
                        e ? (r = e.paused,
                        e.pause()) : r = !0,
                        this.previouslyPaused = r
                    }
                    var i = this.fragCurrent;
                    i && i.loader && i.loader.abort(),
                    this.fragCurrent = null,
                    this.flushMainBuffer(0, t.POSITIVE_INFINITY)
                }
                ,
                v.prototype.immediateLevelSwitchEnd = function() {
                    var t = this.media;
                    t && t.buffered.length && (this.immediateSwitch = !1,
                    n.BufferHelper.isBuffered(t, t.currentTime) && (t.currentTime -= 1e-4),
                    this.previouslyPaused || t.play())
                }
                ,
                v.prototype.nextLevelSwitch = function() {
                    var e = this.media;
                    if (e && e.readyState) {
                        var r, i = void 0, a = void 0;
                        if ((r = this.getBufferedFrag(e.currentTime)) && r.startPTS > 1 && this.flushMainBuffer(0, r.startPTS - 1),
                        e.paused)
                            i = 0;
                        else {
                            var n = this.hls.nextLoadLevel
                              , o = this.levels[n]
                              , s = this.fragLastKbps;
                            i = s && this.fragCurrent ? this.fragCurrent.duration * o.bitrate / (1e3 * s) + 1 : 0
                        }
                        if ((a = this.getBufferedFrag(e.currentTime + i)) && (a = this.followingBufferedFrag(a))) {
                            var l = this.fragCurrent;
                            l && l.loader && l.loader.abort(),
                            this.fragCurrent = null,
                            this.flushMainBuffer(a.maxStartPTS, t.POSITIVE_INFINITY)
                        }
                    }
                }
                ,
                v.prototype.flushMainBuffer = function(t, r) {
                    this.state = e.State.BUFFER_FLUSHING;
                    var i = {
                        startOffset: t,
                        endOffset: r
                    };
                    this.altAudio && (i.type = "video"),
                    this.hls.trigger(s.default.BUFFER_FLUSHING, i)
                }
                ,
                v.prototype.onMediaAttached = function(t) {
                    var e = this.media = this.mediaBuffer = t.media;
                    this.onvseeking = this.onMediaSeeking.bind(this),
                    this.onvseeked = this.onMediaSeeked.bind(this),
                    this.onvended = this.onMediaEnded.bind(this),
                    e.addEventListener("seeking", this.onvseeking),
                    e.addEventListener("seeked", this.onvseeked),
                    e.addEventListener("ended", this.onvended);
                    var r = this.config;
                    this.levels && r.autoStartLoad && this.hls.startLoad(r.startPosition),
                    this.gapController = new m.default(r,e,this.fragmentTracker,this.hls)
                }
                ,
                v.prototype.onMediaDetaching = function() {
                    var t = this.media;
                    t && t.ended && (p.logger.log("MSE detaching and video ended, reset startPosition"),
                    this.startPosition = this.lastCurrentTime = 0);
                    var e = this.levels;
                    e && e.forEach(function(t) {
                        t.details && t.details.fragments.forEach(function(t) {
                            t.backtracked = void 0
                        })
                    }),
                    t && (t.removeEventListener("seeking", this.onvseeking),
                    t.removeEventListener("seeked", this.onvseeked),
                    t.removeEventListener("ended", this.onvended),
                    this.onvseeking = this.onvseeked = this.onvended = null),
                    this.media = this.mediaBuffer = null,
                    this.loadedmetadata = !1,
                    this.stopLoad()
                }
                ,
                v.prototype.onMediaSeeking = function() {
                    var r = this.media
                      , i = r ? r.currentTime : void 0
                      , a = this.config;
                    t.isFinite(i) && p.logger.log("media seeking to " + i.toFixed(3));
                    var o = this.mediaBuffer ? this.mediaBuffer : r
                      , s = n.BufferHelper.bufferInfo(o, i, this.config.maxBufferHole);
                    if (this.state === e.State.FRAG_LOADING) {
                        var l = this.fragCurrent;
                        if (0 === s.len && l) {
                            var u = a.maxFragLookUpTolerance
                              , d = l.start - u
                              , c = l.start + l.duration + u;
                            i < d || i > c ? (l.loader && (p.logger.log("seeking outside of buffer while fragment load in progress, cancel fragment load"),
                            l.loader.abort()),
                            this.fragCurrent = null,
                            this.fragPrevious = null,
                            this.state = e.State.IDLE) : p.logger.log("seeking outside of buffer but within currently loaded fragment range")
                        }
                    } else
                        this.state === e.State.ENDED && (0 === s.len && (this.fragPrevious = 0),
                        this.state = e.State.IDLE);
                    r && (this.lastCurrentTime = i),
                    this.loadedmetadata || (this.nextLoadPosition = this.startPosition = i),
                    this.tick()
                }
                ,
                v.prototype.onMediaSeeked = function() {
                    var e = this.media
                      , r = e ? e.currentTime : void 0;
                    t.isFinite(r) && p.logger.log("media seeked to " + r.toFixed(3)),
                    this.tick()
                }
                ,
                v.prototype.onMediaEnded = function() {
                    p.logger.log("media ended"),
                    this.startPosition = this.lastCurrentTime = 0
                }
                ,
                v.prototype.onManifestLoading = function() {
                    p.logger.log("trigger BUFFER_RESET"),
                    this.hls.trigger(s.default.BUFFER_RESET),
                    this.fragmentTracker.removeAllFragments(),
                    this.stalled = !1,
                    this.startPosition = this.lastCurrentTime = 0
                }
                ,
                v.prototype.onManifestParsed = function(t) {
                    var e, r = !1, i = !1;
                    t.levels.forEach(function(t) {
                        (e = t.audioCodec) && (-1 !== e.indexOf("mp4a.40.2") && (r = !0),
                        -1 !== e.indexOf("mp4a.40.5") && (i = !0))
                    }),
                    this.audioCodecSwitch = r && i,
                    this.audioCodecSwitch && p.logger.log("both AAC/HE-AAC audio found in levels; declaring level codec as HE-AAC"),
                    this.levels = t.levels,
                    this.startFragRequested = !1;
                    var a = this.config;
                    (a.autoStartLoad || this.forceStartLoad) && this.hls.startLoad(a.startPosition)
                }
                ,
                v.prototype.onLevelLoaded = function(r) {
                    var i = r.details
                      , a = r.level
                      , n = this.levels[this.levelLastLoaded]
                      , o = this.levels[a]
                      , l = i.totalduration
                      , u = 0;
                    if (p.logger.log("level " + a + " loaded [" + i.startSN + "," + i.endSN + "],duration:" + l),
                    i.live) {
                        var d = o.details;
                        d && i.fragments.length > 0 ? (c.mergeDetails(d, i),
                        u = i.fragments[0].start,
                        this.liveSyncPosition = this.computeLivePosition(u, d),
                        i.PTSKnown && t.isFinite(u) ? p.logger.log("live playlist sliding:" + u.toFixed(3)) : (p.logger.log("live playlist - outdated PTS, unknown sliding"),
                        g.alignStream(this.fragPrevious, n, i))) : (p.logger.log("live playlist - first load, unknown sliding"),
                        i.PTSKnown = !1,
                        g.alignStream(this.fragPrevious, n, i))
                    } else
                        i.PTSKnown = !1;
                    if (o.details = i,
                    this.levelLastLoaded = a,
                    this.hls.trigger(s.default.LEVEL_UPDATED, {
                        details: i,
                        level: a
                    }),
                    !1 === this.startFragRequested) {
                        if (-1 === this.startPosition || -1 === this.lastCurrentTime) {
                            var f = i.startTimeOffset;
                            t.isFinite(f) ? (f < 0 && (p.logger.log("negative start time offset " + f + ", count from end of last fragment"),
                            f = u + l + f),
                            p.logger.log("start time offset found in playlist, adjust startPosition to " + f),
                            this.startPosition = f) : i.live ? (this.startPosition = this.computeLivePosition(u, i),
                            p.logger.log("configure startPosition to " + this.startPosition)) : this.startPosition = 0,
                            this.lastCurrentTime = this.startPosition
                        }
                        this.nextLoadPosition = this.startPosition
                    }
                    this.state === e.State.WAITING_LEVEL && (this.state = e.State.IDLE),
                    this.tick()
                }
                ,
                v.prototype.onKeyLoaded = function() {
                    this.state === e.State.KEY_LOADING && (this.state = e.State.IDLE,
                    this.tick())
                }
                ,
                v.prototype.onFragLoaded = function(t) {
                    var r = this.fragCurrent
                      , i = this.hls
                      , a = this.levels
                      , n = this.media
                      , l = t.frag;
                    if (this.state === e.State.FRAG_LOADING && r && "main" === l.type && l.level === r.level && l.sn === r.sn) {
                        var u = t.stats
                          , d = a[r.level]
                          , c = d.details;
                        if (this.bitrateTest = !1,
                        this.stats = u,
                        p.logger.log("Loaded " + r.sn + " of [" + c.startSN + " ," + c.endSN + "],level " + r.level),
                        l.bitrateTest && i.nextLoadLevel)
                            this.state = e.State.IDLE,
                            this.startFragRequested = !1,
                            u.tparsed = u.tbuffered = window.performance.now(),
                            i.trigger(s.default.FRAG_BUFFERED, {
                                stats: u,
                                frag: r,
                                id: "main"
                            }),
                            this.tick();
                        else if ("initSegment" === l.sn)
                            this.state = e.State.IDLE,
                            u.tparsed = u.tbuffered = window.performance.now(),
                            c.initSegment.data = t.payload,
                            i.trigger(s.default.FRAG_BUFFERED, {
                                stats: u,
                                frag: r,
                                id: "main"
                            }),
                            this.tick();
                        else {
                            p.logger.log("Parsing " + r.sn + " of [" + c.startSN + " ," + c.endSN + "],level " + r.level + ", cc " + r.cc),
                            this.state = e.State.PARSING,
                            this.pendingBuffering = !0,
                            this.appended = !1,
                            l.bitrateTest && (l.bitrateTest = !1,
                            this.fragmentTracker.onFragLoaded({
                                frag: l
                            }));
                            var f = !(n && n.seeking) && (c.PTSKnown || !c.live)
                              , h = c.initSegment ? c.initSegment.data : []
                              , g = this._getAudioCodec(d);
                            (this.demuxer = this.demuxer || new o.default(this.hls,"main")).push(t.payload, h, g, d.videoCodec, r, c.totalduration, f, void 0, t.url)
                        }
                    }
                    this.fragLoadError = 0
                }
                ,
                v.prototype.onFragParsingInitSegment = function(t) {
                    var r = this.fragCurrent
                      , i = t.frag;
                    if (r && "main" === t.id && i.sn === r.sn && i.level === r.level && this.state === e.State.PARSING) {
                        var a = t.tracks
                          , n = void 0
                          , o = void 0;
                        if (a.audio && this.altAudio && delete a.audio,
                        o = a.audio) {
                            var l = this.levels[this.level].audioCodec
                              , u = navigator.userAgent.toLowerCase();
                            l && this.audioCodecSwap && (p.logger.log("swapping playlist audio codec"),
                            l = -1 !== l.indexOf("mp4a.40.5") ? "mp4a.40.2" : "mp4a.40.5"),
                            this.audioCodecSwitch && 1 !== o.metadata.channelCount && -1 === u.indexOf("firefox") && (l = "mp4a.40.5"),
                            -1 !== u.indexOf("android") && "audio/mpeg" !== o.container && (l = "mp4a.40.2",
                            p.logger.log("Android: force audio codec to " + l)),
                            o.levelCodec = l,
                            o.id = t.id
                        }
                        for (n in (o = a.video) && (o.levelCodec = this.levels[this.level].videoCodec,
                        o.id = t.id),
                        this.hls.trigger(s.default.BUFFER_CODECS, a),
                        a) {
                            o = a[n],
                            p.logger.log("main track:" + n + ",container:" + o.container + ",codecs[level/parsed]=[" + o.levelCodec + "/" + o.codec + "]");
                            var d = o.initSegment;
                            d && (this.appended = !0,
                            this.pendingBuffering = !0,
                            this.hls.trigger(s.default.BUFFER_APPENDING, {
                                type: n,
                                data: d,
                                parent: "main",
                                content: "initSegment"
                            }))
                        }
                        this.tick()
                    }
                }
                ,
                v.prototype.onFragParsingData = function(r) {
                    var i = this
                      , a = this.fragCurrent
                      , n = r.frag;
                    if (a && "main" === r.id && n.sn === a.sn && n.level === a.level && ("audio" !== r.type || !this.altAudio) && this.state === e.State.PARSING) {
                        var o = this.levels[this.level]
                          , l = a;
                        if (t.isFinite(r.endPTS) || (r.endPTS = r.startPTS + a.duration,
                        r.endDTS = r.startDTS + a.duration),
                        !0 === r.hasAudio && l.addElementaryStream(u.default.ElementaryStreamTypes.AUDIO),
                        !0 === r.hasVideo && l.addElementaryStream(u.default.ElementaryStreamTypes.VIDEO),
                        p.logger.log("Parsed " + r.type + ",PTS:[" + r.startPTS.toFixed(3) + "," + r.endPTS.toFixed(3) + "],DTS:[" + r.startDTS.toFixed(3) + "/" + r.endDTS.toFixed(3) + "],nb:" + r.nb + ",dropped:" + (r.dropped || 0)),
                        "video" === r.type)
                            if (l.dropped = r.dropped,
                            l.dropped)
                                if (l.backtracked)
                                    p.logger.warn("Already backtracked on this fragment, appending with the gap", l.sn);
                                else {
                                    var d = o.details;
                                    if (!d || l.sn !== d.startSN)
                                        return p.logger.warn("missing video frame(s), backtracking fragment", l.sn),
                                        this.fragmentTracker.removeFragment(l),
                                        l.backtracked = !0,
                                        this.nextLoadPosition = r.startPTS,
                                        this.state = e.State.IDLE,
                                        this.fragPrevious = l,
                                        void this.tick();
                                    p.logger.warn("missing video frame(s) on first frag, appending with gap", l.sn)
                                }
                            else
                                l.backtracked = !1;
                        var f = c.updateFragPTSDTS(o.details, l, r.startPTS, r.endPTS, r.startDTS, r.endDTS)
                          , h = this.hls;
                        h.trigger(s.default.LEVEL_PTS_UPDATED, {
                            details: o.details,
                            level: this.level,
                            drift: f,
                            type: r.type,
                            start: r.startPTS,
                            end: r.endPTS
                        }),
                        [r.data1, r.data2].forEach(function(t) {
                            t && t.length && i.state === e.State.PARSING && (i.appended = !0,
                            i.pendingBuffering = !0,
                            h.trigger(s.default.BUFFER_APPENDING, {
                                type: r.type,
                                data: t,
                                parent: "main",
                                content: "data"
                            }))
                        }),
                        this.tick()
                    }
                }
                ,
                v.prototype.onFragParsed = function(t) {
                    var r = this.fragCurrent
                      , i = t.frag;
                    r && "main" === t.id && i.sn === r.sn && i.level === r.level && this.state === e.State.PARSING && (this.stats.tparsed = window.performance.now(),
                    this.state = e.State.PARSED,
                    this._checkAppendedParsed())
                }
                ,
                v.prototype.onAudioTrackSwitching = function(r) {
                    var i = !!r.url
                      , a = r.id;
                    if (!i) {
                        if (this.mediaBuffer !== this.media) {
                            p.logger.log("switching on main audio, use media.buffered to schedule main fragment loading"),
                            this.mediaBuffer = this.media;
                            var n = this.fragCurrent;
                            n.loader && (p.logger.log("switching to main audio track, cancel main fragment load"),
                            n.loader.abort()),
                            this.fragCurrent = null,
                            this.fragPrevious = null,
                            this.demuxer && (this.demuxer.destroy(),
                            this.demuxer = null),
                            this.state = e.State.IDLE
                        }
                        var o = this.hls;
                        o.trigger(s.default.BUFFER_FLUSHING, {
                            startOffset: 0,
                            endOffset: t.POSITIVE_INFINITY,
                            type: "audio"
                        }),
                        o.trigger(s.default.AUDIO_TRACK_SWITCHED, {
                            id: a
                        }),
                        this.altAudio = !1
                    }
                }
                ,
                v.prototype.onAudioTrackSwitched = function(t) {
                    var e = t.id
                      , r = !!this.hls.audioTracks[e].url;
                    if (r) {
                        var i = this.videoBuffer;
                        i && this.mediaBuffer !== i && (p.logger.log("switching on alternate audio, use video.buffered to schedule main fragment loading"),
                        this.mediaBuffer = i)
                    }
                    this.altAudio = r,
                    this.tick()
                }
                ,
                v.prototype.onBufferCreated = function(t) {
                    var e, r, i = t.tracks, a = !1;
                    for (var n in i) {
                        var o = i[n];
                        "main" === o.id ? (r = n,
                        e = o,
                        "video" === n && (this.videoBuffer = i[n].buffer)) : a = !0
                    }
                    a && e ? (p.logger.log("alternate track found, use " + r + ".buffered to schedule main fragment loading"),
                    this.mediaBuffer = e.buffer) : this.mediaBuffer = this.media
                }
                ,
                v.prototype.onBufferAppended = function(t) {
                    if ("main" === t.parent) {
                        var r = this.state;
                        r !== e.State.PARSING && r !== e.State.PARSED || (this.pendingBuffering = t.pending > 0,
                        this._checkAppendedParsed())
                    }
                }
                ,
                v.prototype._checkAppendedParsed = function() {
                    if (!(this.state !== e.State.PARSED || this.appended && this.pendingBuffering)) {
                        var t = this.fragCurrent;
                        if (t) {
                            var r = this.mediaBuffer ? this.mediaBuffer : this.media;
                            p.logger.log("main buffered : " + f.default.toString(r.buffered)),
                            this.fragPrevious = t;
                            var i = this.stats;
                            i.tbuffered = window.performance.now(),
                            this.fragLastKbps = Math.round(8 * i.total / (i.tbuffered - i.tfirst)),
                            this.hls.trigger(s.default.FRAG_BUFFERED, {
                                stats: i,
                                frag: t,
                                id: "main"
                            }),
                            this.state = e.State.IDLE
                        }
                        this.tick()
                    }
                }
                ,
                v.prototype.onError = function(r) {
                    var i = r.frag || this.fragCurrent;
                    if (!i || "main" === i.type) {
                        var a = !!this.media && n.BufferHelper.isBuffered(this.media, this.media.currentTime) && n.BufferHelper.isBuffered(this.media, this.media.currentTime + .5);
                        switch (r.details) {
                        case h.ErrorDetails.FRAG_LOAD_ERROR:
                        case h.ErrorDetails.FRAG_LOAD_TIMEOUT:
                        case h.ErrorDetails.KEY_LOAD_ERROR:
                        case h.ErrorDetails.KEY_LOAD_TIMEOUT:
                            if (!r.fatal)
                                if (this.fragLoadError + 1 <= this.config.fragLoadingMaxRetry) {
                                    var o = Math.min(Math.pow(2, this.fragLoadError) * this.config.fragLoadingRetryDelay, this.config.fragLoadingMaxRetryTimeout);
                                    p.logger.warn("mediaController: frag loading failed, retry in " + o + " ms"),
                                    this.retryDate = window.performance.now() + o,
                                    this.loadedmetadata || (this.startFragRequested = !1,
                                    this.nextLoadPosition = this.startPosition),
                                    this.fragLoadError++,
                                    this.state = e.State.FRAG_LOADING_WAITING_RETRY
                                } else
                                    p.logger.error("mediaController: " + r.details + " reaches max retry, redispatch as fatal ..."),
                                    r.fatal = !0,
                                    this.state = e.State.ERROR;
                            break;
                        case h.ErrorDetails.LEVEL_LOAD_ERROR:
                        case h.ErrorDetails.LEVEL_LOAD_TIMEOUT:
                            this.state !== e.State.ERROR && (r.fatal ? (this.state = e.State.ERROR,
                            p.logger.warn("streamController: " + r.details + ",switch to " + this.state + " state ...")) : r.levelRetry || this.state !== e.State.WAITING_LEVEL || (this.state = e.State.IDLE));
                            break;
                        case h.ErrorDetails.BUFFER_FULL_ERROR:
                            "main" !== r.parent || this.state !== e.State.PARSING && this.state !== e.State.PARSED || (a ? (this._reduceMaxBufferLength(this.config.maxBufferLength),
                            this.state = e.State.IDLE) : (p.logger.warn("buffer full error also media.currentTime is not buffered, flush everything"),
                            this.fragCurrent = null,
                            this.flushMainBuffer(0, t.POSITIVE_INFINITY)))
                        }
                    }
                }
                ,
                v.prototype._reduceMaxBufferLength = function(t) {
                    var e = this.config;
                    return e.maxMaxBufferLength >= t && (e.maxMaxBufferLength /= 2,
                    p.logger.warn("main:reduce max buffer length to " + e.maxMaxBufferLength + "s"),
                    !0)
                }
                ,
                v.prototype._checkBuffer = function() {
                    var t = this.media;
                    if (t && 0 !== t.readyState) {
                        var e = (this.mediaBuffer ? this.mediaBuffer : t).buffered;
                        if (!this.loadedmetadata && e.length) {
                            this.loadedmetadata = !0;
                            var r = e.start(0);
                            Math.abs(this.startPosition - r) < this.config.maxBufferHole && (this.startPosition = r),
                            this._seekToStartPos()
                        } else
                            this.immediateSwitch ? this.immediateLevelSwitchEnd() : this.gapController.poll(this.lastCurrentTime, e)
                    }
                }
                ,
                v.prototype.onFragLoadEmergencyAborted = function() {
                    this.state = e.State.IDLE,
                    this.loadedmetadata || (this.startFragRequested = !1,
                    this.nextLoadPosition = this.startPosition),
                    this.tick()
                }
                ,
                v.prototype.onBufferFlushed = function() {
                    var t = this.mediaBuffer ? this.mediaBuffer : this.media;
                    t && this.fragmentTracker.detectEvictedFragments(u.default.ElementaryStreamTypes.VIDEO, t.buffered),
                    this.state = e.State.IDLE,
                    this.fragPrevious = null
                }
                ,
                v.prototype.swapAudioCodec = function() {
                    this.audioCodecSwap = !this.audioCodecSwap
                }
                ,
                v.prototype.computeLivePosition = function(t, e) {
                    var r = void 0 !== this.config.liveSyncDuration ? this.config.liveSyncDuration : this.config.liveSyncDurationCount * e.targetduration;
                    return t + Math.max(0, e.totalduration - r)
                }
                ,
                v.prototype._seekToStartPos = function() {
                    var t = this.media
                      , e = t.currentTime
                      , r = t.seeking ? e : this.startPosition;
                    e !== r && (p.logger.log("target start position not buffered, seek to buffered.start(0) " + r + " from current time " + e + " "),
                    t.currentTime = r)
                }
                ,
                v.prototype._getAudioCodec = function(t) {
                    var e = this.config.defaultAudioCodec || t.audioCodec;
                    return this.audioCodecSwap && (p.logger.log("swapping playlist audio codec"),
                    e && (e = -1 !== e.indexOf("mp4a.40.5") ? "mp4a.40.2" : "mp4a.40.5")),
                    e
                }
                ,
                Object.defineProperty(v.prototype, "liveSyncPosition", {
                    get: function() {
                        return this._liveSyncPosition
                    },
                    set: function(t) {
                        this._liveSyncPosition = t
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                v
            }(v.default);
            e.default = _
        }
        ).call(this, r(3).Number)
    }
    , function(t, e, r) {
        function i(t) {
            var e = {};
            function r(i) {
                if (e[i])
                    return e[i].exports;
                var a = e[i] = {
                    i: i,
                    l: !1,
                    exports: {}
                };
                return t[i].call(a.exports, a, a.exports, r),
                a.l = !0,
                a.exports
            }
            r.m = t,
            r.c = e,
            r.i = function(t) {
                return t
            }
            ,
            r.d = function(t, e, i) {
                r.o(t, e) || Object.defineProperty(t, e, {
                    configurable: !1,
                    enumerable: !0,
                    get: i
                })
            }
            ,
            r.r = function(t) {
                Object.defineProperty(t, "__esModule", {
                    value: !0
                })
            }
            ,
            r.n = function(t) {
                var e = t && t.__esModule ? function() {
                    return t.default
                }
                : function() {
                    return t
                }
                ;
                return r.d(e, "a", e),
                e
            }
            ,
            r.o = function(t, e) {
                return Object.prototype.hasOwnProperty.call(t, e)
            }
            ,
            r.p = "/",
            r.oe = function(t) {
                throw console.error(t),
                t
            }
            ;
            var i = r(r.s = ENTRY_MODULE);
            return i.default || i
        }
        var a = "[\\.|\\-|\\+|\\w|/|@]+"
          , n = "\\((/\\*.*?\\*/)?s?.*?(" + a + ").*?\\)";
        function o(t) {
            return (t + "").replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&")
        }
        function s(t) {
            return !isNaN(1 * t)
        }
        function l(t, e, i) {
            var l = {};
            l[i] = [];
            var u = e.toString()
              , d = u.match(/^function\s?\(\w+,\s*\w+,\s*(\w+)\)/);
            if (!d)
                return l;
            for (var c, f = d[1], h = new RegExp("(\\\\n|\\W)" + o(f) + n,"g"); c = h.exec(u); )
                "dll-reference" !== c[3] && l[i].push(c[3]);
            for (h = new RegExp("\\(" + o(f) + '\\("(dll-reference\\s(' + a + '))"\\)\\)' + n,"g"); c = h.exec(u); )
                t[c[2]] || (l[i].push(c[1]),
                t[c[2]] = r(c[1]).m),
                l[c[2]] = l[c[2]] || [],
                l[c[2]].push(c[4]);
            for (var p = Object.keys(l), g = 0; g < p.length; g++)
                for (var v = 0; v < l[p[g]].length; v++)
                    s(l[p[g]][v]) && (l[p[g]][v] = 1 * l[p[g]][v]);
            return l
        }
        function u(t) {
            return Object.keys(t).reduce(function(e, r) {
                return e || t[r].length > 0
            }, !1)
        }
        t.exports = function(t, e) {
            e = e || {};
            var a = {
                main: r.m
            }
              , n = e.all ? {
                main: Object.keys(a.main)
            } : function(t, e) {
                for (var r = {
                    main: [e]
                }, i = {
                    main: []
                }, a = {
                    main: {}
                }; u(r); )
                    for (var n = Object.keys(r), o = 0; o < n.length; o++) {
                        var s = n[o]
                          , d = r[s].pop();
                        if (a[s] = a[s] || {},
                        !a[s][d] && t[s][d]) {
                            a[s][d] = !0,
                            i[s] = i[s] || [],
                            i[s].push(d);
                            for (var c = l(t, t[s][d], s), f = Object.keys(c), h = 0; h < f.length; h++)
                                r[f[h]] = r[f[h]] || [],
                                r[f[h]] = r[f[h]].concat(c[f[h]])
                        }
                    }
                return i
            }(a, t)
              , o = "";
            Object.keys(n).filter(function(t) {
                return "main" !== t
            }).forEach(function(t) {
                for (var e = 0; n[t][e]; )
                    e++;
                n[t].push(e),
                a[t][e] = "(function(module, exports, __webpack_require__) { module.exports = __webpack_require__; })",
                o = o + "var " + t + " = (" + i.toString().replace("ENTRY_MODULE", JSON.stringify(e)) + ")({" + n[t].map(function(e) {
                    return JSON.stringify(e) + ": " + a[t][e].toString()
                }).join(",") + "});\n"
            }),
            o = o + "new ((" + i.toString().replace("ENTRY_MODULE", JSON.stringify(t)) + ")({" + n.main.map(function(t) {
                return JSON.stringify(t) + ": " + a.main[t].toString()
            }).join(",") + "}))(self);";
            var s = new window.Blob([o],{
                type: "text/javascript"
            });
            if (e.bare)
                return s;
            var d = (window.URL || window.webkitURL || window.mozURL || window.msURL).createObjectURL(s)
              , c = new window.Worker(d);
            return c.objectURL = d,
            c
        }
    }
    , function(t, e, r) {
        t.exports = function() {
            var t = t || function(t, e) {
                var r = Object.create || function() {
                    function t() {}
                    return function(e) {
                        var r;
                        return t.prototype = e,
                        r = new t,
                        t.prototype = null,
                        r
                    }
                }()
                  , i = {}
                  , a = i.lib = {}
                  , n = a.Base = {
                    extend: function(t) {
                        var e = r(this);
                        return t && e.mixIn(t),
                        e.hasOwnProperty("init") && this.init !== e.init || (e.init = function() {
                            e.$super.init.apply(this, arguments)
                        }
                        ),
                        e.init.prototype = e,
                        e.$super = this,
                        e
                    },
                    create: function() {
                        var t = this.extend();
                        return t.init.apply(t, arguments),
                        t
                    },
                    init: function() {},
                    mixIn: function(t) {
                        for (var e in t)
                            t.hasOwnProperty(e) && (this[e] = t[e]);
                        t.hasOwnProperty("toString") && (this.toString = t.toString)
                    },
                    clone: function() {
                        return this.init.prototype.extend(this)
                    }
                }
                  , o = a.WordArray = n.extend({
                    init: function(t, e) {
                        t = this.words = t || [],
                        this.sigBytes = void 0 != e ? e : 4 * t.length
                    },
                    toString: function(t) {
                        return (t || l).stringify(this)
                    },
                    concat: function(t) {
                        var e = this.words
                          , r = t.words
                          , i = this.sigBytes
                          , a = t.sigBytes;
                        if (this.clamp(),
                        i % 4)
                            for (var n = 0; n < a; n++) {
                                var o = r[n >>> 2] >>> 24 - n % 4 * 8 & 255;
                                e[i + n >>> 2] |= o << 24 - (i + n) % 4 * 8
                            }
                        else
                            for (var n = 0; n < a; n += 4)
                                e[i + n >>> 2] = r[n >>> 2];
                        return this.sigBytes += a,
                        this
                    },
                    clamp: function() {
                        var e = this.words
                          , r = this.sigBytes;
                        e[r >>> 2] &= 4294967295 << 32 - r % 4 * 8,
                        e.length = t.ceil(r / 4)
                    },
                    clone: function() {
                        var t = n.clone.call(this);
                        return t.words = this.words.slice(0),
                        t
                    },
                    random: function(e) {
                        for (var r, i = [], a = function(e) {
                            var e = e
                              , r = 987654321
                              , i = 4294967295;
                            return function() {
                                var a = ((r = 36969 * (65535 & r) + (r >> 16) & i) << 16) + (e = 18e3 * (65535 & e) + (e >> 16) & i) & i;
                                return a /= 4294967296,
                                (a += .5) * (t.random() > .5 ? 1 : -1)
                            }
                        }, n = 0; n < e; n += 4) {
                            var s = a(4294967296 * (r || t.random()));
                            r = 987654071 * s(),
                            i.push(4294967296 * s() | 0)
                        }
                        return new o.init(i,e)
                    }
                })
                  , s = i.enc = {}
                  , l = s.Hex = {
                    stringify: function(t) {
                        for (var e = t.words, r = t.sigBytes, i = [], a = 0; a < r; a++) {
                            var n = e[a >>> 2] >>> 24 - a % 4 * 8 & 255;
                            i.push((n >>> 4).toString(16)),
                            i.push((15 & n).toString(16))
                        }
                        return i.join("")
                    },
                    parse: function(t) {
                        for (var e = t.length, r = [], i = 0; i < e; i += 2)
                            r[i >>> 3] |= parseInt(t.substr(i, 2), 16) << 24 - i % 8 * 4;
                        return new o.init(r,e / 2)
                    }
                }
                  , u = s.Latin1 = {
                    stringify: function(t) {
                        for (var e = t.words, r = t.sigBytes, i = [], a = 0; a < r; a++) {
                            var n = e[a >>> 2] >>> 24 - a % 4 * 8 & 255;
                            i.push(String.fromCharCode(n))
                        }
                        return i.join("")
                    },
                    parse: function(t) {
                        for (var e = t.length, r = [], i = 0; i < e; i++)
                            r[i >>> 2] |= (255 & t.charCodeAt(i)) << 24 - i % 4 * 8;
                        return new o.init(r,e)
                    }
                }
                  , d = s.Utf8 = {
                    stringify: function(t) {
                        try {
                            return decodeURIComponent(escape(u.stringify(t)))
                        } catch (t) {
                            throw new Error("Malformed UTF-8 data")
                        }
                    },
                    parse: function(t) {
                        return u.parse(unescape(encodeURIComponent(t)))
                    }
                }
                  , c = a.BufferedBlockAlgorithm = n.extend({
                    reset: function() {
                        this._data = new o.init,
                        this._nDataBytes = 0
                    },
                    _append: function(t) {
                        "string" == typeof t && (t = d.parse(t)),
                        this._data.concat(t),
                        this._nDataBytes += t.sigBytes
                    },
                    _process: function(e) {
                        var r = this._data
                          , i = r.words
                          , a = r.sigBytes
                          , n = this.blockSize
                          , s = 4 * n
                          , l = a / s
                          , u = (l = e ? t.ceil(l) : t.max((0 | l) - this._minBufferSize, 0)) * n
                          , d = t.min(4 * u, a);
                        if (u) {
                            for (var c = 0; c < u; c += n)
                                this._doProcessBlock(i, c);
                            var f = i.splice(0, u);
                            r.sigBytes -= d
                        }
                        return new o.init(f,d)
                    },
                    clone: function() {
                        var t = n.clone.call(this);
                        return t._data = this._data.clone(),
                        t
                    },
                    _minBufferSize: 0
                })
                  , f = (a.Hasher = c.extend({
                    cfg: n.extend(),
                    init: function(t) {
                        this.cfg = this.cfg.extend(t),
                        this.reset()
                    },
                    reset: function() {
                        c.reset.call(this),
                        this._doReset()
                    },
                    update: function(t) {
                        return this._append(t),
                        this._process(),
                        this
                    },
                    finalize: function(t) {
                        t && this._append(t);
                        var e = this._doFinalize();
                        return e
                    },
                    blockSize: 16,
                    _createHelper: function(t) {
                        return function(e, r) {
                            return new t.init(r).finalize(e)
                        }
                    },
                    _createHmacHelper: function(t) {
                        return function(e, r) {
                            return new f.HMAC.init(t,r).finalize(e)
                        }
                    }
                }),
                i.algo = {});
                return i
            }(Math);
            return function() {
                var e = t
                  , r = e.lib.WordArray;
                e.enc.Base64 = {
                    stringify: function(t) {
                        var e = t.words
                          , r = t.sigBytes
                          , i = this._map;
                        t.clamp();
                        for (var a = [], n = 0; n < r; n += 3)
                            for (var o = (e[n >>> 2] >>> 24 - n % 4 * 8 & 255) << 16 | (e[n + 1 >>> 2] >>> 24 - (n + 1) % 4 * 8 & 255) << 8 | e[n + 2 >>> 2] >>> 24 - (n + 2) % 4 * 8 & 255, s = 0; s < 4 && n + .75 * s < r; s++)
                                a.push(i.charAt(o >>> 6 * (3 - s) & 63));
                        var l = i.charAt(64);
                        if (l)
                            for (; a.length % 4; )
                                a.push(l);
                        return a.join("")
                    },
                    parse: function(t) {
                        var e = t.length
                          , i = this._map
                          , a = this._reverseMap;
                        if (!a) {
                            a = this._reverseMap = [];
                            for (var n = 0; n < i.length; n++)
                                a[i.charCodeAt(n)] = n
                        }
                        var o = i.charAt(64);
                        if (o) {
                            var s = t.indexOf(o);
                            -1 !== s && (e = s)
                        }
                        return function(t, e, i) {
                            for (var a = [], n = 0, o = 0; o < e; o++)
                                if (o % 4) {
                                    var s = i[t.charCodeAt(o - 1)] << o % 4 * 2
                                      , l = i[t.charCodeAt(o)] >>> 6 - o % 4 * 2;
                                    a[n >>> 2] |= (s | l) << 24 - n % 4 * 8,
                                    n++
                                }
                            return r.create(a, n)
                        }(t, e, a)
                    },
                    _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
                }
            }(),
            function(e) {
                var r = t
                  , i = r.lib
                  , a = i.WordArray
                  , n = i.Hasher
                  , o = r.algo
                  , s = [];
                !function() {
                    for (var t = 0; t < 64; t++)
                        s[t] = 4294967296 * e.abs(e.sin(t + 1)) | 0
                }();
                var l = o.MD5 = n.extend({
                    _doReset: function() {
                        this._hash = new a.init([1732584193, 4023233417, 2562383102, 271733878])
                    },
                    _doProcessBlock: function(t, e) {
                        for (var r = 0; r < 16; r++) {
                            var i = e + r
                              , a = t[i];
                            t[i] = 16711935 & (a << 8 | a >>> 24) | 4278255360 & (a << 24 | a >>> 8)
                        }
                        var n = this._hash.words
                          , o = t[e + 0]
                          , l = t[e + 1]
                          , h = t[e + 2]
                          , p = t[e + 3]
                          , g = t[e + 4]
                          , v = t[e + 5]
                          , y = t[e + 6]
                          , m = t[e + 7]
                          , _ = t[e + 8]
                          , E = t[e + 9]
                          , T = t[e + 10]
                          , S = t[e + 11]
                          , b = t[e + 12]
                          , A = t[e + 13]
                          , R = t[e + 14]
                          , D = t[e + 15]
                          , L = n[0]
                          , w = n[1]
                          , k = n[2]
                          , O = n[3];
                        w = f(w = f(w = f(w = f(w = c(w = c(w = c(w = c(w = d(w = d(w = d(w = d(w = u(w = u(w = u(w = u(w, k = u(k, O = u(O, L = u(L, w, k, O, o, 7, s[0]), w, k, l, 12, s[1]), L, w, h, 17, s[2]), O, L, p, 22, s[3]), k = u(k, O = u(O, L = u(L, w, k, O, g, 7, s[4]), w, k, v, 12, s[5]), L, w, y, 17, s[6]), O, L, m, 22, s[7]), k = u(k, O = u(O, L = u(L, w, k, O, _, 7, s[8]), w, k, E, 12, s[9]), L, w, T, 17, s[10]), O, L, S, 22, s[11]), k = u(k, O = u(O, L = u(L, w, k, O, b, 7, s[12]), w, k, A, 12, s[13]), L, w, R, 17, s[14]), O, L, D, 22, s[15]), k = d(k, O = d(O, L = d(L, w, k, O, l, 5, s[16]), w, k, y, 9, s[17]), L, w, S, 14, s[18]), O, L, o, 20, s[19]), k = d(k, O = d(O, L = d(L, w, k, O, v, 5, s[20]), w, k, T, 9, s[21]), L, w, D, 14, s[22]), O, L, g, 20, s[23]), k = d(k, O = d(O, L = d(L, w, k, O, E, 5, s[24]), w, k, R, 9, s[25]), L, w, p, 14, s[26]), O, L, _, 20, s[27]), k = d(k, O = d(O, L = d(L, w, k, O, A, 5, s[28]), w, k, h, 9, s[29]), L, w, m, 14, s[30]), O, L, b, 20, s[31]), k = c(k, O = c(O, L = c(L, w, k, O, v, 4, s[32]), w, k, _, 11, s[33]), L, w, S, 16, s[34]), O, L, R, 23, s[35]), k = c(k, O = c(O, L = c(L, w, k, O, l, 4, s[36]), w, k, g, 11, s[37]), L, w, m, 16, s[38]), O, L, T, 23, s[39]), k = c(k, O = c(O, L = c(L, w, k, O, A, 4, s[40]), w, k, o, 11, s[41]), L, w, p, 16, s[42]), O, L, y, 23, s[43]), k = c(k, O = c(O, L = c(L, w, k, O, E, 4, s[44]), w, k, b, 11, s[45]), L, w, D, 16, s[46]), O, L, h, 23, s[47]), k = f(k, O = f(O, L = f(L, w, k, O, o, 6, s[48]), w, k, m, 10, s[49]), L, w, R, 15, s[50]), O, L, v, 21, s[51]), k = f(k, O = f(O, L = f(L, w, k, O, b, 6, s[52]), w, k, p, 10, s[53]), L, w, T, 15, s[54]), O, L, l, 21, s[55]), k = f(k, O = f(O, L = f(L, w, k, O, _, 6, s[56]), w, k, D, 10, s[57]), L, w, y, 15, s[58]), O, L, A, 21, s[59]), k = f(k, O = f(O, L = f(L, w, k, O, g, 6, s[60]), w, k, S, 10, s[61]), L, w, h, 15, s[62]), O, L, E, 21, s[63]),
                        n[0] = n[0] + L | 0,
                        n[1] = n[1] + w | 0,
                        n[2] = n[2] + k | 0,
                        n[3] = n[3] + O | 0
                    },
                    _doFinalize: function() {
                        var t = this._data
                          , r = t.words
                          , i = 8 * this._nDataBytes
                          , a = 8 * t.sigBytes;
                        r[a >>> 5] |= 128 << 24 - a % 32;
                        var n = e.floor(i / 4294967296)
                          , o = i;
                        r[15 + (a + 64 >>> 9 << 4)] = 16711935 & (n << 8 | n >>> 24) | 4278255360 & (n << 24 | n >>> 8),
                        r[14 + (a + 64 >>> 9 << 4)] = 16711935 & (o << 8 | o >>> 24) | 4278255360 & (o << 24 | o >>> 8),
                        t.sigBytes = 4 * (r.length + 1),
                        this._process();
                        for (var s = this._hash, l = s.words, u = 0; u < 4; u++) {
                            var d = l[u];
                            l[u] = 16711935 & (d << 8 | d >>> 24) | 4278255360 & (d << 24 | d >>> 8)
                        }
                        return s
                    },
                    clone: function() {
                        var t = n.clone.call(this);
                        return t._hash = this._hash.clone(),
                        t
                    }
                });
                function u(t, e, r, i, a, n, o) {
                    var s = t + (e & r | ~e & i) + a + o;
                    return (s << n | s >>> 32 - n) + e
                }
                function d(t, e, r, i, a, n, o) {
                    var s = t + (e & i | r & ~i) + a + o;
                    return (s << n | s >>> 32 - n) + e
                }
                function c(t, e, r, i, a, n, o) {
                    var s = t + (e ^ r ^ i) + a + o;
                    return (s << n | s >>> 32 - n) + e
                }
                function f(t, e, r, i, a, n, o) {
                    var s = t + (r ^ (e | ~i)) + a + o;
                    return (s << n | s >>> 32 - n) + e
                }
                r.MD5 = n._createHelper(l),
                r.HmacMD5 = n._createHmacHelper(l)
            }(Math),
            function() {
                var e = t
                  , r = e.lib
                  , i = r.WordArray
                  , a = r.Hasher
                  , n = []
                  , o = e.algo.SHA1 = a.extend({
                    _doReset: function() {
                        this._hash = new i.init([1732584193, 4023233417, 2562383102, 271733878, 3285377520])
                    },
                    _doProcessBlock: function(t, e) {
                        for (var r = this._hash.words, i = r[0], a = r[1], o = r[2], s = r[3], l = r[4], u = 0; u < 80; u++) {
                            if (u < 16)
                                n[u] = 0 | t[e + u];
                            else {
                                var d = n[u - 3] ^ n[u - 8] ^ n[u - 14] ^ n[u - 16];
                                n[u] = d << 1 | d >>> 31
                            }
                            var c = (i << 5 | i >>> 27) + l + n[u];
                            c += u < 20 ? 1518500249 + (a & o | ~a & s) : u < 40 ? 1859775393 + (a ^ o ^ s) : u < 60 ? (a & o | a & s | o & s) - 1894007588 : (a ^ o ^ s) - 899497514,
                            l = s,
                            s = o,
                            o = a << 30 | a >>> 2,
                            a = i,
                            i = c
                        }
                        r[0] = r[0] + i | 0,
                        r[1] = r[1] + a | 0,
                        r[2] = r[2] + o | 0,
                        r[3] = r[3] + s | 0,
                        r[4] = r[4] + l | 0
                    },
                    _doFinalize: function() {
                        var t = this._data
                          , e = t.words
                          , r = 8 * this._nDataBytes
                          , i = 8 * t.sigBytes;
                        return e[i >>> 5] |= 128 << 24 - i % 32,
                        e[14 + (i + 64 >>> 9 << 4)] = Math.floor(r / 4294967296),
                        e[15 + (i + 64 >>> 9 << 4)] = r,
                        t.sigBytes = 4 * e.length,
                        this._process(),
                        this._hash
                    },
                    clone: function() {
                        var t = a.clone.call(this);
                        return t._hash = this._hash.clone(),
                        t
                    }
                });
                e.SHA1 = a._createHelper(o),
                e.HmacSHA1 = a._createHmacHelper(o)
            }(),
            function(e) {
                var r = t
                  , i = r.lib
                  , a = i.WordArray
                  , n = i.Hasher
                  , o = r.algo
                  , s = []
                  , l = [];
                !function() {
                    function t(t) {
                        for (var r = e.sqrt(t), i = 2; i <= r; i++)
                            if (!(t % i))
                                return !1;
                        return !0
                    }
                    function r(t) {
                        return 4294967296 * (t - (0 | t)) | 0
                    }
                    for (var i = 2, a = 0; a < 64; )
                        t(i) && (a < 8 && (s[a] = r(e.pow(i, .5))),
                        l[a] = r(e.pow(i, 1 / 3)),
                        a++),
                        i++
                }();
                var u = []
                  , d = o.SHA256 = n.extend({
                    _doReset: function() {
                        this._hash = new a.init(s.slice(0))
                    },
                    _doProcessBlock: function(t, e) {
                        for (var r = this._hash.words, i = r[0], a = r[1], n = r[2], o = r[3], s = r[4], d = r[5], c = r[6], f = r[7], h = 0; h < 64; h++) {
                            if (h < 16)
                                u[h] = 0 | t[e + h];
                            else {
                                var p = u[h - 15]
                                  , g = (p << 25 | p >>> 7) ^ (p << 14 | p >>> 18) ^ p >>> 3
                                  , v = u[h - 2]
                                  , y = (v << 15 | v >>> 17) ^ (v << 13 | v >>> 19) ^ v >>> 10;
                                u[h] = g + u[h - 7] + y + u[h - 16]
                            }
                            var m = i & a ^ i & n ^ a & n
                              , _ = (i << 30 | i >>> 2) ^ (i << 19 | i >>> 13) ^ (i << 10 | i >>> 22)
                              , E = f + ((s << 26 | s >>> 6) ^ (s << 21 | s >>> 11) ^ (s << 7 | s >>> 25)) + (s & d ^ ~s & c) + l[h] + u[h];
                            f = c,
                            c = d,
                            d = s,
                            s = o + E | 0,
                            o = n,
                            n = a,
                            a = i,
                            i = E + (_ + m) | 0
                        }
                        r[0] = r[0] + i | 0,
                        r[1] = r[1] + a | 0,
                        r[2] = r[2] + n | 0,
                        r[3] = r[3] + o | 0,
                        r[4] = r[4] + s | 0,
                        r[5] = r[5] + d | 0,
                        r[6] = r[6] + c | 0,
                        r[7] = r[7] + f | 0
                    },
                    _doFinalize: function() {
                        var t = this._data
                          , r = t.words
                          , i = 8 * this._nDataBytes
                          , a = 8 * t.sigBytes;
                        return r[a >>> 5] |= 128 << 24 - a % 32,
                        r[14 + (a + 64 >>> 9 << 4)] = e.floor(i / 4294967296),
                        r[15 + (a + 64 >>> 9 << 4)] = i,
                        t.sigBytes = 4 * r.length,
                        this._process(),
                        this._hash
                    },
                    clone: function() {
                        var t = n.clone.call(this);
                        return t._hash = this._hash.clone(),
                        t
                    }
                });
                r.SHA256 = n._createHelper(d),
                r.HmacSHA256 = n._createHmacHelper(d)
            }(Math),
            function() {
                var e = t
                  , r = e.lib.WordArray
                  , i = e.enc;
                function a(t) {
                    return t << 8 & 4278255360 | t >>> 8 & 16711935
                }
                i.Utf16 = i.Utf16BE = {
                    stringify: function(t) {
                        for (var e = t.words, r = t.sigBytes, i = [], a = 0; a < r; a += 2) {
                            var n = e[a >>> 2] >>> 16 - a % 4 * 8 & 65535;
                            i.push(String.fromCharCode(n))
                        }
                        return i.join("")
                    },
                    parse: function(t) {
                        for (var e = t.length, i = [], a = 0; a < e; a++)
                            i[a >>> 1] |= t.charCodeAt(a) << 16 - a % 2 * 16;
                        return r.create(i, 2 * e)
                    }
                },
                i.Utf16LE = {
                    stringify: function(t) {
                        for (var e = t.words, r = t.sigBytes, i = [], n = 0; n < r; n += 2) {
                            var o = a(e[n >>> 2] >>> 16 - n % 4 * 8 & 65535);
                            i.push(String.fromCharCode(o))
                        }
                        return i.join("")
                    },
                    parse: function(t) {
                        for (var e = t.length, i = [], n = 0; n < e; n++)
                            i[n >>> 1] |= a(t.charCodeAt(n) << 16 - n % 2 * 16);
                        return r.create(i, 2 * e)
                    }
                }
            }(),
            function() {
                if ("function" == typeof ArrayBuffer) {
                    var e = t.lib.WordArray
                      , r = e.init;
                    (e.init = function(t) {
                        if (t instanceof ArrayBuffer && (t = new Uint8Array(t)),
                        (t instanceof Int8Array || "undefined" != typeof Uint8ClampedArray && t instanceof Uint8ClampedArray || t instanceof Int16Array || t instanceof Uint16Array || t instanceof Int32Array || t instanceof Uint32Array || t instanceof Float32Array || t instanceof Float64Array) && (t = new Uint8Array(t.buffer,t.byteOffset,t.byteLength)),
                        t instanceof Uint8Array) {
                            for (var e = t.byteLength, i = [], a = 0; a < e; a++)
                                i[a >>> 2] |= t[a] << 24 - a % 4 * 8;
                            r.call(this, i, e)
                        } else
                            r.apply(this, arguments)
                    }
                    ).prototype = e
                }
            }(),
            function(e) {
                var r = t
                  , i = r.lib
                  , a = i.WordArray
                  , n = i.Hasher
                  , o = r.algo
                  , s = a.create([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8, 3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12, 1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2, 4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13])
                  , l = a.create([5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2, 15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13, 8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14, 12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11])
                  , u = a.create([11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12, 11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5, 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12, 9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6])
                  , d = a.create([8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11, 9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5, 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8, 8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11])
                  , c = a.create([0, 1518500249, 1859775393, 2400959708, 2840853838])
                  , f = a.create([1352829926, 1548603684, 1836072691, 2053994217, 0])
                  , h = o.RIPEMD160 = n.extend({
                    _doReset: function() {
                        this._hash = a.create([1732584193, 4023233417, 2562383102, 271733878, 3285377520])
                    },
                    _doProcessBlock: function(t, e) {
                        for (var r = 0; r < 16; r++) {
                            var i = e + r
                              , a = t[i];
                            t[i] = 16711935 & (a << 8 | a >>> 24) | 4278255360 & (a << 24 | a >>> 8)
                        }
                        var n, o, h, E, T, S, b, A, R, D, L, w = this._hash.words, k = c.words, O = f.words, I = s.words, P = l.words, C = u.words, x = d.words;
                        for (S = n = w[0],
                        b = o = w[1],
                        A = h = w[2],
                        R = E = w[3],
                        D = T = w[4],
                        r = 0; r < 80; r += 1)
                            L = n + t[e + I[r]] | 0,
                            L += r < 16 ? p(o, h, E) + k[0] : r < 32 ? g(o, h, E) + k[1] : r < 48 ? v(o, h, E) + k[2] : r < 64 ? y(o, h, E) + k[3] : m(o, h, E) + k[4],
                            L = (L = _(L |= 0, C[r])) + T | 0,
                            n = T,
                            T = E,
                            E = _(h, 10),
                            h = o,
                            o = L,
                            L = S + t[e + P[r]] | 0,
                            L += r < 16 ? m(b, A, R) + O[0] : r < 32 ? y(b, A, R) + O[1] : r < 48 ? v(b, A, R) + O[2] : r < 64 ? g(b, A, R) + O[3] : p(b, A, R) + O[4],
                            L = (L = _(L |= 0, x[r])) + D | 0,
                            S = D,
                            D = R,
                            R = _(A, 10),
                            A = b,
                            b = L;
                        L = w[1] + h + R | 0,
                        w[1] = w[2] + E + D | 0,
                        w[2] = w[3] + T + S | 0,
                        w[3] = w[4] + n + b | 0,
                        w[4] = w[0] + o + A | 0,
                        w[0] = L
                    },
                    _doFinalize: function() {
                        var t = this._data
                          , e = t.words
                          , r = 8 * this._nDataBytes
                          , i = 8 * t.sigBytes;
                        e[i >>> 5] |= 128 << 24 - i % 32,
                        e[14 + (i + 64 >>> 9 << 4)] = 16711935 & (r << 8 | r >>> 24) | 4278255360 & (r << 24 | r >>> 8),
                        t.sigBytes = 4 * (e.length + 1),
                        this._process();
                        for (var a = this._hash, n = a.words, o = 0; o < 5; o++) {
                            var s = n[o];
                            n[o] = 16711935 & (s << 8 | s >>> 24) | 4278255360 & (s << 24 | s >>> 8)
                        }
                        return a
                    },
                    clone: function() {
                        var t = n.clone.call(this);
                        return t._hash = this._hash.clone(),
                        t
                    }
                });
                function p(t, e, r) {
                    return t ^ e ^ r
                }
                function g(t, e, r) {
                    return t & e | ~t & r
                }
                function v(t, e, r) {
                    return (t | ~e) ^ r
                }
                function y(t, e, r) {
                    return t & r | e & ~r
                }
                function m(t, e, r) {
                    return t ^ (e | ~r)
                }
                function _(t, e) {
                    return t << e | t >>> 32 - e
                }
                r.RIPEMD160 = n._createHelper(h),
                r.HmacRIPEMD160 = n._createHmacHelper(h)
            }(Math),
            function() {
                var e = t
                  , r = e.lib.Base
                  , i = e.enc.Utf8;
                e.algo.HMAC = r.extend({
                    init: function(t, e) {
                        t = this._hasher = new t.init,
                        "string" == typeof e && (e = i.parse(e));
                        var r = t.blockSize
                          , a = 4 * r;
                        e.sigBytes > a && (e = t.finalize(e)),
                        e.clamp();
                        for (var n = this._oKey = e.clone(), o = this._iKey = e.clone(), s = n.words, l = o.words, u = 0; u < r; u++)
                            s[u] ^= 1549556828,
                            l[u] ^= 909522486;
                        n.sigBytes = o.sigBytes = a,
                        this.reset()
                    },
                    reset: function() {
                        var t = this._hasher;
                        t.reset(),
                        t.update(this._iKey)
                    },
                    update: function(t) {
                        return this._hasher.update(t),
                        this
                    },
                    finalize: function(t) {
                        var e = this._hasher
                          , r = e.finalize(t);
                        return e.reset(),
                        e.finalize(this._oKey.clone().concat(r))
                    }
                })
            }(),
            function() {
                var e = t
                  , r = e.lib
                  , i = r.Base
                  , a = r.WordArray
                  , n = e.algo
                  , o = n.SHA1
                  , s = n.HMAC
                  , l = n.PBKDF2 = i.extend({
                    cfg: i.extend({
                        keySize: 4,
                        hasher: o,
                        iterations: 1
                    }),
                    init: function(t) {
                        this.cfg = this.cfg.extend(t)
                    },
                    compute: function(t, e) {
                        for (var r = this.cfg, i = s.create(r.hasher, t), n = a.create(), o = a.create([1]), l = n.words, u = o.words, d = r.keySize, c = r.iterations; l.length < d; ) {
                            var f = i.update(e).finalize(o);
                            i.reset();
                            for (var h = f.words, p = h.length, g = f, v = 1; v < c; v++) {
                                g = i.finalize(g),
                                i.reset();
                                for (var y = g.words, m = 0; m < p; m++)
                                    h[m] ^= y[m]
                            }
                            n.concat(f),
                            u[0]++
                        }
                        return n.sigBytes = 4 * d,
                        n
                    }
                });
                e.PBKDF2 = function(t, e, r) {
                    return l.create(r).compute(t, e)
                }
            }(),
            function() {
                var e = t
                  , r = e.lib
                  , i = r.Base
                  , a = r.WordArray
                  , n = e.algo
                  , o = n.MD5
                  , s = n.EvpKDF = i.extend({
                    cfg: i.extend({
                        keySize: 4,
                        hasher: o,
                        iterations: 1
                    }),
                    init: function(t) {
                        this.cfg = this.cfg.extend(t)
                    },
                    compute: function(t, e) {
                        for (var r = this.cfg, i = r.hasher.create(), n = a.create(), o = n.words, s = r.keySize, l = r.iterations; o.length < s; ) {
                            u && i.update(u);
                            var u = i.update(t).finalize(e);
                            i.reset();
                            for (var d = 1; d < l; d++)
                                u = i.finalize(u),
                                i.reset();
                            n.concat(u)
                        }
                        return n.sigBytes = 4 * s,
                        n
                    }
                });
                e.EvpKDF = function(t, e, r) {
                    return s.create(r).compute(t, e)
                }
            }(),
            function() {
                var e = t
                  , r = e.lib.WordArray
                  , i = e.algo
                  , a = i.SHA256
                  , n = i.SHA224 = a.extend({
                    _doReset: function() {
                        this._hash = new r.init([3238371032, 914150663, 812702999, 4144912697, 4290775857, 1750603025, 1694076839, 3204075428])
                    },
                    _doFinalize: function() {
                        var t = a._doFinalize.call(this);
                        return t.sigBytes -= 4,
                        t
                    }
                });
                e.SHA224 = a._createHelper(n),
                e.HmacSHA224 = a._createHmacHelper(n)
            }(),
            function(e) {
                var r = t
                  , i = r.lib
                  , a = i.Base
                  , n = i.WordArray
                  , o = r.x64 = {};
                o.Word = a.extend({
                    init: function(t, e) {
                        this.high = t,
                        this.low = e
                    }
                }),
                o.WordArray = a.extend({
                    init: function(t, e) {
                        t = this.words = t || [],
                        this.sigBytes = void 0 != e ? e : 8 * t.length
                    },
                    toX32: function() {
                        for (var t = this.words, e = t.length, r = [], i = 0; i < e; i++) {
                            var a = t[i];
                            r.push(a.high),
                            r.push(a.low)
                        }
                        return n.create(r, this.sigBytes)
                    },
                    clone: function() {
                        for (var t = a.clone.call(this), e = t.words = this.words.slice(0), r = e.length, i = 0; i < r; i++)
                            e[i] = e[i].clone();
                        return t
                    }
                })
            }(),
            function(e) {
                var r = t
                  , i = r.lib
                  , a = i.WordArray
                  , n = i.Hasher
                  , o = r.x64.Word
                  , s = r.algo
                  , l = []
                  , u = []
                  , d = [];
                !function() {
                    for (var t = 1, e = 0, r = 0; r < 24; r++) {
                        l[t + 5 * e] = (r + 1) * (r + 2) / 2 % 64;
                        var i = (2 * t + 3 * e) % 5;
                        t = e % 5,
                        e = i
                    }
                    for (t = 0; t < 5; t++)
                        for (e = 0; e < 5; e++)
                            u[t + 5 * e] = e + (2 * t + 3 * e) % 5 * 5;
                    for (var a = 1, n = 0; n < 24; n++) {
                        for (var s = 0, c = 0, f = 0; f < 7; f++) {
                            if (1 & a) {
                                var h = (1 << f) - 1;
                                h < 32 ? c ^= 1 << h : s ^= 1 << h - 32
                            }
                            128 & a ? a = a << 1 ^ 113 : a <<= 1
                        }
                        d[n] = o.create(s, c)
                    }
                }();
                var c = [];
                !function() {
                    for (var t = 0; t < 25; t++)
                        c[t] = o.create()
                }();
                var f = s.SHA3 = n.extend({
                    cfg: n.cfg.extend({
                        outputLength: 512
                    }),
                    _doReset: function() {
                        for (var t = this._state = [], e = 0; e < 25; e++)
                            t[e] = new o.init;
                        this.blockSize = (1600 - 2 * this.cfg.outputLength) / 32
                    },
                    _doProcessBlock: function(t, e) {
                        for (var r = this._state, i = this.blockSize / 2, a = 0; a < i; a++) {
                            var n = t[e + 2 * a]
                              , o = t[e + 2 * a + 1];
                            n = 16711935 & (n << 8 | n >>> 24) | 4278255360 & (n << 24 | n >>> 8),
                            o = 16711935 & (o << 8 | o >>> 24) | 4278255360 & (o << 24 | o >>> 8),
                            (w = r[a]).high ^= o,
                            w.low ^= n
                        }
                        for (var s = 0; s < 24; s++) {
                            for (var f = 0; f < 5; f++) {
                                for (var h = 0, p = 0, g = 0; g < 5; g++)
                                    h ^= (w = r[f + 5 * g]).high,
                                    p ^= w.low;
                                var v = c[f];
                                v.high = h,
                                v.low = p
                            }
                            for (f = 0; f < 5; f++) {
                                var y = c[(f + 4) % 5]
                                  , m = c[(f + 1) % 5]
                                  , _ = m.high
                                  , E = m.low;
                                for (h = y.high ^ (_ << 1 | E >>> 31),
                                p = y.low ^ (E << 1 | _ >>> 31),
                                g = 0; g < 5; g++)
                                    (w = r[f + 5 * g]).high ^= h,
                                    w.low ^= p
                            }
                            for (var T = 1; T < 25; T++) {
                                var S = (w = r[T]).high
                                  , b = w.low
                                  , A = l[T];
                                A < 32 ? (h = S << A | b >>> 32 - A,
                                p = b << A | S >>> 32 - A) : (h = b << A - 32 | S >>> 64 - A,
                                p = S << A - 32 | b >>> 64 - A);
                                var R = c[u[T]];
                                R.high = h,
                                R.low = p
                            }
                            var D = c[0]
                              , L = r[0];
                            for (D.high = L.high,
                            D.low = L.low,
                            f = 0; f < 5; f++)
                                for (g = 0; g < 5; g++) {
                                    var w = r[T = f + 5 * g]
                                      , k = c[T]
                                      , O = c[(f + 1) % 5 + 5 * g]
                                      , I = c[(f + 2) % 5 + 5 * g];
                                    w.high = k.high ^ ~O.high & I.high,
                                    w.low = k.low ^ ~O.low & I.low
                                }
                            w = r[0];
                            var P = d[s];
                            w.high ^= P.high,
                            w.low ^= P.low
                        }
                    },
                    _doFinalize: function() {
                        var t = this._data
                          , r = t.words
                          , i = (this._nDataBytes,
                        8 * t.sigBytes)
                          , n = 32 * this.blockSize;
                        r[i >>> 5] |= 1 << 24 - i % 32,
                        r[(e.ceil((i + 1) / n) * n >>> 5) - 1] |= 128,
                        t.sigBytes = 4 * r.length,
                        this._process();
                        for (var o = this._state, s = this.cfg.outputLength / 8, l = s / 8, u = [], d = 0; d < l; d++) {
                            var c = o[d]
                              , f = c.high
                              , h = c.low;
                            f = 16711935 & (f << 8 | f >>> 24) | 4278255360 & (f << 24 | f >>> 8),
                            h = 16711935 & (h << 8 | h >>> 24) | 4278255360 & (h << 24 | h >>> 8),
                            u.push(h),
                            u.push(f)
                        }
                        return new a.init(u,s)
                    },
                    clone: function() {
                        for (var t = n.clone.call(this), e = t._state = this._state.slice(0), r = 0; r < 25; r++)
                            e[r] = e[r].clone();
                        return t
                    }
                });
                r.SHA3 = n._createHelper(f),
                r.HmacSHA3 = n._createHmacHelper(f)
            }(Math),
            function() {
                var e = t
                  , r = e.lib.Hasher
                  , i = e.x64
                  , a = i.Word
                  , n = i.WordArray
                  , o = e.algo;
                function s() {
                    return a.create.apply(a, arguments)
                }
                var l = [s(1116352408, 3609767458), s(1899447441, 602891725), s(3049323471, 3964484399), s(3921009573, 2173295548), s(961987163, 4081628472), s(1508970993, 3053834265), s(2453635748, 2937671579), s(2870763221, 3664609560), s(3624381080, 2734883394), s(310598401, 1164996542), s(607225278, 1323610764), s(1426881987, 3590304994), s(1925078388, 4068182383), s(2162078206, 991336113), s(2614888103, 633803317), s(3248222580, 3479774868), s(3835390401, 2666613458), s(4022224774, 944711139), s(264347078, 2341262773), s(604807628, 2007800933), s(770255983, 1495990901), s(1249150122, 1856431235), s(1555081692, 3175218132), s(1996064986, 2198950837), s(2554220882, 3999719339), s(2821834349, 766784016), s(2952996808, 2566594879), s(3210313671, 3203337956), s(3336571891, 1034457026), s(3584528711, 2466948901), s(113926993, 3758326383), s(338241895, 168717936), s(666307205, 1188179964), s(773529912, 1546045734), s(1294757372, 1522805485), s(1396182291, 2643833823), s(1695183700, 2343527390), s(1986661051, 1014477480), s(2177026350, 1206759142), s(2456956037, 344077627), s(2730485921, 1290863460), s(2820302411, 3158454273), s(3259730800, 3505952657), s(3345764771, 106217008), s(3516065817, 3606008344), s(3600352804, 1432725776), s(4094571909, 1467031594), s(275423344, 851169720), s(430227734, 3100823752), s(506948616, 1363258195), s(659060556, 3750685593), s(883997877, 3785050280), s(958139571, 3318307427), s(1322822218, 3812723403), s(1537002063, 2003034995), s(1747873779, 3602036899), s(1955562222, 1575990012), s(2024104815, 1125592928), s(2227730452, 2716904306), s(2361852424, 442776044), s(2428436474, 593698344), s(2756734187, 3733110249), s(3204031479, 2999351573), s(3329325298, 3815920427), s(3391569614, 3928383900), s(3515267271, 566280711), s(3940187606, 3454069534), s(4118630271, 4000239992), s(116418474, 1914138554), s(174292421, 2731055270), s(289380356, 3203993006), s(460393269, 320620315), s(685471733, 587496836), s(852142971, 1086792851), s(1017036298, 365543100), s(1126000580, 2618297676), s(1288033470, 3409855158), s(1501505948, 4234509866), s(1607167915, 987167468), s(1816402316, 1246189591)]
                  , u = [];
                !function() {
                    for (var t = 0; t < 80; t++)
                        u[t] = s()
                }();
                var d = o.SHA512 = r.extend({
                    _doReset: function() {
                        this._hash = new n.init([new a.init(1779033703,4089235720), new a.init(3144134277,2227873595), new a.init(1013904242,4271175723), new a.init(2773480762,1595750129), new a.init(1359893119,2917565137), new a.init(2600822924,725511199), new a.init(528734635,4215389547), new a.init(1541459225,327033209)])
                    },
                    _doProcessBlock: function(t, e) {
                        for (var r = this._hash.words, i = r[0], a = r[1], n = r[2], o = r[3], s = r[4], d = r[5], c = r[6], f = r[7], h = i.high, p = i.low, g = a.high, v = a.low, y = n.high, m = n.low, _ = o.high, E = o.low, T = s.high, S = s.low, b = d.high, A = d.low, R = c.high, D = c.low, L = f.high, w = f.low, k = h, O = p, I = g, P = v, C = y, x = m, F = _, M = E, B = T, N = S, U = b, G = A, j = R, H = D, K = L, W = w, z = 0; z < 80; z++) {
                            var Y = u[z];
                            if (z < 16)
                                var V = Y.high = 0 | t[e + 2 * z]
                                  , q = Y.low = 0 | t[e + 2 * z + 1];
                            else {
                                var X = u[z - 15]
                                  , Q = X.high
                                  , Z = X.low
                                  , $ = (Q >>> 1 | Z << 31) ^ (Q >>> 8 | Z << 24) ^ Q >>> 7
                                  , J = (Z >>> 1 | Q << 31) ^ (Z >>> 8 | Q << 24) ^ (Z >>> 7 | Q << 25)
                                  , tt = u[z - 2]
                                  , et = tt.high
                                  , rt = tt.low
                                  , it = (et >>> 19 | rt << 13) ^ (et << 3 | rt >>> 29) ^ et >>> 6
                                  , at = (rt >>> 19 | et << 13) ^ (rt << 3 | et >>> 29) ^ (rt >>> 6 | et << 26)
                                  , nt = u[z - 7]
                                  , ot = nt.high
                                  , st = nt.low
                                  , lt = u[z - 16]
                                  , ut = lt.high
                                  , dt = lt.low;
                                V = (V = (V = $ + ot + ((q = J + st) >>> 0 < J >>> 0 ? 1 : 0)) + it + ((q += at) >>> 0 < at >>> 0 ? 1 : 0)) + ut + ((q += dt) >>> 0 < dt >>> 0 ? 1 : 0),
                                Y.high = V,
                                Y.low = q
                            }
                            var ct, ft = B & U ^ ~B & j, ht = N & G ^ ~N & H, pt = k & I ^ k & C ^ I & C, gt = O & P ^ O & x ^ P & x, vt = (k >>> 28 | O << 4) ^ (k << 30 | O >>> 2) ^ (k << 25 | O >>> 7), yt = (O >>> 28 | k << 4) ^ (O << 30 | k >>> 2) ^ (O << 25 | k >>> 7), mt = (B >>> 14 | N << 18) ^ (B >>> 18 | N << 14) ^ (B << 23 | N >>> 9), _t = (N >>> 14 | B << 18) ^ (N >>> 18 | B << 14) ^ (N << 23 | B >>> 9), Et = l[z], Tt = Et.high, St = Et.low, bt = K + mt + ((ct = W + _t) >>> 0 < W >>> 0 ? 1 : 0), At = yt + gt;
                            K = j,
                            W = H,
                            j = U,
                            H = G,
                            U = B,
                            G = N,
                            B = F + (bt = (bt = (bt = bt + ft + ((ct += ht) >>> 0 < ht >>> 0 ? 1 : 0)) + Tt + ((ct += St) >>> 0 < St >>> 0 ? 1 : 0)) + V + ((ct += q) >>> 0 < q >>> 0 ? 1 : 0)) + ((N = M + ct | 0) >>> 0 < M >>> 0 ? 1 : 0) | 0,
                            F = C,
                            M = x,
                            C = I,
                            x = P,
                            I = k,
                            P = O,
                            k = bt + (vt + pt + (At >>> 0 < yt >>> 0 ? 1 : 0)) + ((O = ct + At | 0) >>> 0 < ct >>> 0 ? 1 : 0) | 0
                        }
                        p = i.low = p + O,
                        i.high = h + k + (p >>> 0 < O >>> 0 ? 1 : 0),
                        v = a.low = v + P,
                        a.high = g + I + (v >>> 0 < P >>> 0 ? 1 : 0),
                        m = n.low = m + x,
                        n.high = y + C + (m >>> 0 < x >>> 0 ? 1 : 0),
                        E = o.low = E + M,
                        o.high = _ + F + (E >>> 0 < M >>> 0 ? 1 : 0),
                        S = s.low = S + N,
                        s.high = T + B + (S >>> 0 < N >>> 0 ? 1 : 0),
                        A = d.low = A + G,
                        d.high = b + U + (A >>> 0 < G >>> 0 ? 1 : 0),
                        D = c.low = D + H,
                        c.high = R + j + (D >>> 0 < H >>> 0 ? 1 : 0),
                        w = f.low = w + W,
                        f.high = L + K + (w >>> 0 < W >>> 0 ? 1 : 0)
                    },
                    _doFinalize: function() {
                        var t = this._data
                          , e = t.words
                          , r = 8 * this._nDataBytes
                          , i = 8 * t.sigBytes;
                        return e[i >>> 5] |= 128 << 24 - i % 32,
                        e[30 + (i + 128 >>> 10 << 5)] = Math.floor(r / 4294967296),
                        e[31 + (i + 128 >>> 10 << 5)] = r,
                        t.sigBytes = 4 * e.length,
                        this._process(),
                        this._hash.toX32()
                    },
                    clone: function() {
                        var t = r.clone.call(this);
                        return t._hash = this._hash.clone(),
                        t
                    },
                    blockSize: 32
                });
                e.SHA512 = r._createHelper(d),
                e.HmacSHA512 = r._createHmacHelper(d)
            }(),
            function() {
                var e = t
                  , r = e.x64
                  , i = r.Word
                  , a = r.WordArray
                  , n = e.algo
                  , o = n.SHA512
                  , s = n.SHA384 = o.extend({
                    _doReset: function() {
                        this._hash = new a.init([new i.init(3418070365,3238371032), new i.init(1654270250,914150663), new i.init(2438529370,812702999), new i.init(355462360,4144912697), new i.init(1731405415,4290775857), new i.init(2394180231,1750603025), new i.init(3675008525,1694076839), new i.init(1203062813,3204075428)])
                    },
                    _doFinalize: function() {
                        var t = o._doFinalize.call(this);
                        return t.sigBytes -= 16,
                        t
                    }
                });
                e.SHA384 = o._createHelper(s),
                e.HmacSHA384 = o._createHmacHelper(s)
            }(),
            t.lib.Cipher || function(e) {
                var r = t
                  , i = r.lib
                  , a = i.Base
                  , n = i.WordArray
                  , o = i.BufferedBlockAlgorithm
                  , s = r.enc
                  , l = (s.Utf8,
                s.Base64)
                  , u = r.algo.EvpKDF
                  , d = i.Cipher = o.extend({
                    cfg: a.extend(),
                    createEncryptor: function(t, e) {
                        return this.create(this._ENC_XFORM_MODE, t, e)
                    },
                    createDecryptor: function(t, e) {
                        return this.create(this._DEC_XFORM_MODE, t, e)
                    },
                    init: function(t, e, r) {
                        this.cfg = this.cfg.extend(r),
                        this._xformMode = t,
                        this._key = e,
                        this.reset()
                    },
                    reset: function() {
                        o.reset.call(this),
                        this._doReset()
                    },
                    process: function(t) {
                        return this._append(t),
                        this._process()
                    },
                    finalize: function(t) {
                        return t && this._append(t),
                        this._doFinalize()
                    },
                    keySize: 4,
                    ivSize: 4,
                    _ENC_XFORM_MODE: 1,
                    _DEC_XFORM_MODE: 2,
                    _createHelper: function() {
                        function t(t) {
                            return "string" == typeof t ? _ : y
                        }
                        return function(e) {
                            return {
                                encrypt: function(r, i, a) {
                                    return t(i).encrypt(e, r, i, a)
                                },
                                decrypt: function(r, i, a) {
                                    return t(i).decrypt(e, r, i, a)
                                }
                            }
                        }
                    }()
                })
                  , c = (i.StreamCipher = d.extend({
                    _doFinalize: function() {
                        return this._process(!0)
                    },
                    blockSize: 1
                }),
                r.mode = {})
                  , f = i.BlockCipherMode = a.extend({
                    createEncryptor: function(t, e) {
                        return this.Encryptor.create(t, e)
                    },
                    createDecryptor: function(t, e) {
                        return this.Decryptor.create(t, e)
                    },
                    init: function(t, e) {
                        this._cipher = t,
                        this._iv = e
                    }
                })
                  , h = c.CBC = function() {
                    var t = f.extend();
                    function r(t, r, i) {
                        var a = this._iv;
                        if (a) {
                            var n = a;
                            this._iv = e
                        } else
                            n = this._prevBlock;
                        for (var o = 0; o < i; o++)
                            t[r + o] ^= n[o]
                    }
                    return t.Encryptor = t.extend({
                        processBlock: function(t, e) {
                            var i = this._cipher
                              , a = i.blockSize;
                            r.call(this, t, e, a),
                            i.encryptBlock(t, e),
                            this._prevBlock = t.slice(e, e + a)
                        }
                    }),
                    t.Decryptor = t.extend({
                        processBlock: function(t, e) {
                            var i = this._cipher
                              , a = i.blockSize
                              , n = t.slice(e, e + a);
                            i.decryptBlock(t, e),
                            r.call(this, t, e, a),
                            this._prevBlock = n
                        }
                    }),
                    t
                }()
                  , p = (r.pad = {}).Pkcs7 = {
                    pad: function(t, e) {
                        for (var r = 4 * e, i = r - t.sigBytes % r, a = i << 24 | i << 16 | i << 8 | i, o = [], s = 0; s < i; s += 4)
                            o.push(a);
                        var l = n.create(o, i);
                        t.concat(l)
                    },
                    unpad: function(t) {
                        var e = 255 & t.words[t.sigBytes - 1 >>> 2];
                        t.sigBytes -= e
                    }
                }
                  , g = (i.BlockCipher = d.extend({
                    cfg: d.cfg.extend({
                        mode: h,
                        padding: p
                    }),
                    reset: function() {
                        d.reset.call(this);
                        var t = this.cfg
                          , e = t.iv
                          , r = t.mode;
                        if (this._xformMode == this._ENC_XFORM_MODE)
                            var i = r.createEncryptor;
                        else
                            i = r.createDecryptor,
                            this._minBufferSize = 1;
                        this._mode && this._mode.__creator == i ? this._mode.init(this, e && e.words) : (this._mode = i.call(r, this, e && e.words),
                        this._mode.__creator = i)
                    },
                    _doProcessBlock: function(t, e) {
                        this._mode.processBlock(t, e)
                    },
                    _doFinalize: function() {
                        var t = this.cfg.padding;
                        if (this._xformMode == this._ENC_XFORM_MODE) {
                            t.pad(this._data, this.blockSize);
                            var e = this._process(!0)
                        } else
                            e = this._process(!0),
                            t.unpad(e);
                        return e
                    },
                    blockSize: 4
                }),
                i.CipherParams = a.extend({
                    init: function(t) {
                        this.mixIn(t)
                    },
                    toString: function(t) {
                        return (t || this.formatter).stringify(this)
                    }
                }))
                  , v = (r.format = {}).OpenSSL = {
                    stringify: function(t) {
                        var e = t.ciphertext
                          , r = t.salt;
                        if (r)
                            var i = n.create([1398893684, 1701076831]).concat(r).concat(e);
                        else
                            i = e;
                        return i.toString(l)
                    },
                    parse: function(t) {
                        var e = l.parse(t)
                          , r = e.words;
                        if (1398893684 == r[0] && 1701076831 == r[1]) {
                            var i = n.create(r.slice(2, 4));
                            r.splice(0, 4),
                            e.sigBytes -= 16
                        }
                        return g.create({
                            ciphertext: e,
                            salt: i
                        })
                    }
                }
                  , y = i.SerializableCipher = a.extend({
                    cfg: a.extend({
                        format: v
                    }),
                    encrypt: function(t, e, r, i) {
                        i = this.cfg.extend(i);
                        var a = t.createEncryptor(r, i)
                          , n = a.finalize(e)
                          , o = a.cfg;
                        return g.create({
                            ciphertext: n,
                            key: r,
                            iv: o.iv,
                            algorithm: t,
                            mode: o.mode,
                            padding: o.padding,
                            blockSize: t.blockSize,
                            formatter: i.format
                        })
                    },
                    decrypt: function(t, e, r, i) {
                        return i = this.cfg.extend(i),
                        e = this._parse(e, i.format),
                        t.createDecryptor(r, i).finalize(e.ciphertext)
                    },
                    _parse: function(t, e) {
                        return "string" == typeof t ? e.parse(t, this) : t
                    }
                })
                  , m = (r.kdf = {}).OpenSSL = {
                    execute: function(t, e, r, i) {
                        i || (i = n.random(8));
                        var a = u.create({
                            keySize: e + r
                        }).compute(t, i)
                          , o = n.create(a.words.slice(e), 4 * r);
                        return a.sigBytes = 4 * e,
                        g.create({
                            key: a,
                            iv: o,
                            salt: i
                        })
                    }
                }
                  , _ = i.PasswordBasedCipher = y.extend({
                    cfg: y.cfg.extend({
                        kdf: m
                    }),
                    encrypt: function(t, e, r, i) {
                        var a = (i = this.cfg.extend(i)).kdf.execute(r, t.keySize, t.ivSize);
                        i.iv = a.iv;
                        var n = y.encrypt.call(this, t, e, a.key, i);
                        return n.mixIn(a),
                        n
                    },
                    decrypt: function(t, e, r, i) {
                        i = this.cfg.extend(i),
                        e = this._parse(e, i.format);
                        var a = i.kdf.execute(r, t.keySize, t.ivSize, e.salt);
                        return i.iv = a.iv,
                        y.decrypt.call(this, t, e, a.key, i)
                    }
                })
            }(),
            t.mode.CFB = function() {
                var e = t.lib.BlockCipherMode.extend();
                function r(t, e, r, i) {
                    var a = this._iv;
                    if (a) {
                        var n = a.slice(0);
                        this._iv = void 0
                    } else
                        n = this._prevBlock;
                    i.encryptBlock(n, 0);
                    for (var o = 0; o < r; o++)
                        t[e + o] ^= n[o]
                }
                return e.Encryptor = e.extend({
                    processBlock: function(t, e) {
                        var i = this._cipher
                          , a = i.blockSize;
                        r.call(this, t, e, a, i),
                        this._prevBlock = t.slice(e, e + a)
                    }
                }),
                e.Decryptor = e.extend({
                    processBlock: function(t, e) {
                        var i = this._cipher
                          , a = i.blockSize
                          , n = t.slice(e, e + a);
                        r.call(this, t, e, a, i),
                        this._prevBlock = n
                    }
                }),
                e
            }(),
            t.mode.ECB = function() {
                var e = t.lib.BlockCipherMode.extend();
                return e.Encryptor = e.extend({
                    processBlock: function(t, e) {
                        this._cipher.encryptBlock(t, e)
                    }
                }),
                e.Decryptor = e.extend({
                    processBlock: function(t, e) {
                        this._cipher.decryptBlock(t, e)
                    }
                }),
                e
            }(),
            t.pad.AnsiX923 = {
                pad: function(t, e) {
                    var r = t.sigBytes
                      , i = 4 * e
                      , a = i - r % i
                      , n = r + a - 1;
                    t.clamp(),
                    t.words[n >>> 2] |= a << 24 - n % 4 * 8,
                    t.sigBytes += a
                },
                unpad: function(t) {
                    var e = 255 & t.words[t.sigBytes - 1 >>> 2];
                    t.sigBytes -= e
                }
            },
            t.pad.Iso10126 = {
                pad: function(e, r) {
                    var i = 4 * r
                      , a = i - e.sigBytes % i;
                    e.concat(t.lib.WordArray.random(a - 1)).concat(t.lib.WordArray.create([a << 24], 1))
                },
                unpad: function(t) {
                    var e = 255 & t.words[t.sigBytes - 1 >>> 2];
                    t.sigBytes -= e
                }
            },
            t.pad.Iso97971 = {
                pad: function(e, r) {
                    e.concat(t.lib.WordArray.create([2147483648], 1)),
                    t.pad.ZeroPadding.pad(e, r)
                },
                unpad: function(e) {
                    t.pad.ZeroPadding.unpad(e),
                    e.sigBytes--
                }
            },
            t.mode.OFB = function() {
                var e = t.lib.BlockCipherMode.extend()
                  , r = e.Encryptor = e.extend({
                    processBlock: function(t, e) {
                        var r = this._cipher
                          , i = r.blockSize
                          , a = this._iv
                          , n = this._keystream;
                        a && (n = this._keystream = a.slice(0),
                        this._iv = void 0),
                        r.encryptBlock(n, 0);
                        for (var o = 0; o < i; o++)
                            t[e + o] ^= n[o]
                    }
                });
                return e.Decryptor = r,
                e
            }(),
            t.pad.NoPadding = {
                pad: function() {},
                unpad: function() {}
            },
            function(e) {
                var r = t
                  , i = r.lib.CipherParams
                  , a = r.enc.Hex;
                r.format.Hex = {
                    stringify: function(t) {
                        return t.ciphertext.toString(a)
                    },
                    parse: function(t) {
                        var e = a.parse(t);
                        return i.create({
                            ciphertext: e
                        })
                    }
                }
            }(),
            function() {
                var e = t
                  , r = e.lib.BlockCipher
                  , i = e.algo
                  , a = []
                  , n = []
                  , o = []
                  , s = []
                  , l = []
                  , u = []
                  , d = []
                  , c = []
                  , f = []
                  , h = [];
                !function() {
                    for (var t = [], e = 0; e < 256; e++)
                        t[e] = e < 128 ? e << 1 : e << 1 ^ 283;
                    var r = 0
                      , i = 0;
                    for (e = 0; e < 256; e++) {
                        var p = i ^ i << 1 ^ i << 2 ^ i << 3 ^ i << 4;
                        p = p >>> 8 ^ 255 & p ^ 99,
                        a[r] = p,
                        n[p] = r;
                        var g = t[r]
                          , v = t[g]
                          , y = t[v]
                          , m = 257 * t[p] ^ 16843008 * p;
                        o[r] = m << 24 | m >>> 8,
                        s[r] = m << 16 | m >>> 16,
                        l[r] = m << 8 | m >>> 24,
                        u[r] = m,
                        m = 16843009 * y ^ 65537 * v ^ 257 * g ^ 16843008 * r,
                        d[p] = m << 24 | m >>> 8,
                        c[p] = m << 16 | m >>> 16,
                        f[p] = m << 8 | m >>> 24,
                        h[p] = m,
                        r ? (r = g ^ t[t[t[y ^ g]]],
                        i ^= t[t[i]]) : r = i = 1
                    }
                }();
                var p = [0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54]
                  , g = i.AES = r.extend({
                    _doReset: function() {
                        if (!this._nRounds || this._keyPriorReset !== this._key) {
                            for (var t = this._keyPriorReset = this._key, e = t.words, r = t.sigBytes / 4, i = 4 * ((this._nRounds = r + 6) + 1), n = this._keySchedule = [], o = 0; o < i; o++)
                                if (o < r)
                                    n[o] = e[o];
                                else {
                                    var s = n[o - 1];
                                    o % r ? r > 6 && o % r == 4 && (s = a[s >>> 24] << 24 | a[s >>> 16 & 255] << 16 | a[s >>> 8 & 255] << 8 | a[255 & s]) : (s = a[(s = s << 8 | s >>> 24) >>> 24] << 24 | a[s >>> 16 & 255] << 16 | a[s >>> 8 & 255] << 8 | a[255 & s],
                                    s ^= p[o / r | 0] << 24),
                                    n[o] = n[o - r] ^ s
                                }
                            for (var l = this._invKeySchedule = [], u = 0; u < i; u++)
                                o = i - u,
                                s = u % 4 ? n[o] : n[o - 4],
                                l[u] = u < 4 || o <= 4 ? s : d[a[s >>> 24]] ^ c[a[s >>> 16 & 255]] ^ f[a[s >>> 8 & 255]] ^ h[a[255 & s]]
                        }
                    },
                    encryptBlock: function(t, e) {
                        this._doCryptBlock(t, e, this._keySchedule, o, s, l, u, a)
                    },
                    decryptBlock: function(t, e) {
                        var r = t[e + 1];
                        t[e + 1] = t[e + 3],
                        t[e + 3] = r,
                        this._doCryptBlock(t, e, this._invKeySchedule, d, c, f, h, n),
                        r = t[e + 1],
                        t[e + 1] = t[e + 3],
                        t[e + 3] = r
                    },
                    _doCryptBlock: function(t, e, r, i, a, n, o, s) {
                        for (var l = this._nRounds, u = t[e] ^ r[0], d = t[e + 1] ^ r[1], c = t[e + 2] ^ r[2], f = t[e + 3] ^ r[3], h = 4, p = 1; p < l; p++) {
                            var g = i[u >>> 24] ^ a[d >>> 16 & 255] ^ n[c >>> 8 & 255] ^ o[255 & f] ^ r[h++]
                              , v = i[d >>> 24] ^ a[c >>> 16 & 255] ^ n[f >>> 8 & 255] ^ o[255 & u] ^ r[h++]
                              , y = i[c >>> 24] ^ a[f >>> 16 & 255] ^ n[u >>> 8 & 255] ^ o[255 & d] ^ r[h++]
                              , m = i[f >>> 24] ^ a[u >>> 16 & 255] ^ n[d >>> 8 & 255] ^ o[255 & c] ^ r[h++];
                            u = g,
                            d = v,
                            c = y,
                            f = m
                        }
                        g = (s[u >>> 24] << 24 | s[d >>> 16 & 255] << 16 | s[c >>> 8 & 255] << 8 | s[255 & f]) ^ r[h++],
                        v = (s[d >>> 24] << 24 | s[c >>> 16 & 255] << 16 | s[f >>> 8 & 255] << 8 | s[255 & u]) ^ r[h++],
                        y = (s[c >>> 24] << 24 | s[f >>> 16 & 255] << 16 | s[u >>> 8 & 255] << 8 | s[255 & d]) ^ r[h++],
                        m = (s[f >>> 24] << 24 | s[u >>> 16 & 255] << 16 | s[d >>> 8 & 255] << 8 | s[255 & c]) ^ r[h++],
                        t[e] = g,
                        t[e + 1] = v,
                        t[e + 2] = y,
                        t[e + 3] = m
                    },
                    keySize: 8
                });
                e.AES = r._createHelper(g)
            }(),
            function() {
                var e = t
                  , r = e.lib
                  , i = r.WordArray
                  , a = r.BlockCipher
                  , n = e.algo
                  , o = [57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36, 63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4]
                  , s = [14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2, 41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32]
                  , l = [1, 2, 4, 6, 8, 10, 12, 14, 15, 17, 19, 21, 23, 25, 27, 28]
                  , u = [{
                    0: 8421888,
                    268435456: 32768,
                    536870912: 8421378,
                    805306368: 2,
                    1073741824: 512,
                    1342177280: 8421890,
                    1610612736: 8389122,
                    1879048192: 8388608,
                    2147483648: 514,
                    2415919104: 8389120,
                    2684354560: 33280,
                    2952790016: 8421376,
                    3221225472: 32770,
                    3489660928: 8388610,
                    3758096384: 0,
                    4026531840: 33282,
                    134217728: 0,
                    402653184: 8421890,
                    671088640: 33282,
                    939524096: 32768,
                    1207959552: 8421888,
                    1476395008: 512,
                    1744830464: 8421378,
                    2013265920: 2,
                    2281701376: 8389120,
                    2550136832: 33280,
                    2818572288: 8421376,
                    3087007744: 8389122,
                    3355443200: 8388610,
                    3623878656: 32770,
                    3892314112: 514,
                    4160749568: 8388608,
                    1: 32768,
                    268435457: 2,
                    536870913: 8421888,
                    805306369: 8388608,
                    1073741825: 8421378,
                    1342177281: 33280,
                    1610612737: 512,
                    1879048193: 8389122,
                    2147483649: 8421890,
                    2415919105: 8421376,
                    2684354561: 8388610,
                    2952790017: 33282,
                    3221225473: 514,
                    3489660929: 8389120,
                    3758096385: 32770,
                    4026531841: 0,
                    134217729: 8421890,
                    402653185: 8421376,
                    671088641: 8388608,
                    939524097: 512,
                    1207959553: 32768,
                    1476395009: 8388610,
                    1744830465: 2,
                    2013265921: 33282,
                    2281701377: 32770,
                    2550136833: 8389122,
                    2818572289: 514,
                    3087007745: 8421888,
                    3355443201: 8389120,
                    3623878657: 0,
                    3892314113: 33280,
                    4160749569: 8421378
                }, {
                    0: 1074282512,
                    16777216: 16384,
                    33554432: 524288,
                    50331648: 1074266128,
                    67108864: 1073741840,
                    83886080: 1074282496,
                    100663296: 1073758208,
                    117440512: 16,
                    134217728: 540672,
                    150994944: 1073758224,
                    167772160: 1073741824,
                    184549376: 540688,
                    201326592: 524304,
                    218103808: 0,
                    234881024: 16400,
                    251658240: 1074266112,
                    8388608: 1073758208,
                    25165824: 540688,
                    41943040: 16,
                    58720256: 1073758224,
                    75497472: 1074282512,
                    92274688: 1073741824,
                    109051904: 524288,
                    125829120: 1074266128,
                    142606336: 524304,
                    159383552: 0,
                    176160768: 16384,
                    192937984: 1074266112,
                    209715200: 1073741840,
                    226492416: 540672,
                    243269632: 1074282496,
                    260046848: 16400,
                    268435456: 0,
                    285212672: 1074266128,
                    301989888: 1073758224,
                    318767104: 1074282496,
                    335544320: 1074266112,
                    352321536: 16,
                    369098752: 540688,
                    385875968: 16384,
                    402653184: 16400,
                    419430400: 524288,
                    436207616: 524304,
                    452984832: 1073741840,
                    469762048: 540672,
                    486539264: 1073758208,
                    503316480: 1073741824,
                    520093696: 1074282512,
                    276824064: 540688,
                    293601280: 524288,
                    310378496: 1074266112,
                    327155712: 16384,
                    343932928: 1073758208,
                    360710144: 1074282512,
                    377487360: 16,
                    394264576: 1073741824,
                    411041792: 1074282496,
                    427819008: 1073741840,
                    444596224: 1073758224,
                    461373440: 524304,
                    478150656: 0,
                    494927872: 16400,
                    511705088: 1074266128,
                    528482304: 540672
                }, {
                    0: 260,
                    1048576: 0,
                    2097152: 67109120,
                    3145728: 65796,
                    4194304: 65540,
                    5242880: 67108868,
                    6291456: 67174660,
                    7340032: 67174400,
                    8388608: 67108864,
                    9437184: 67174656,
                    10485760: 65792,
                    11534336: 67174404,
                    12582912: 67109124,
                    13631488: 65536,
                    14680064: 4,
                    15728640: 256,
                    524288: 67174656,
                    1572864: 67174404,
                    2621440: 0,
                    3670016: 67109120,
                    4718592: 67108868,
                    5767168: 65536,
                    6815744: 65540,
                    7864320: 260,
                    8912896: 4,
                    9961472: 256,
                    11010048: 67174400,
                    12058624: 65796,
                    13107200: 65792,
                    14155776: 67109124,
                    15204352: 67174660,
                    16252928: 67108864,
                    16777216: 67174656,
                    17825792: 65540,
                    18874368: 65536,
                    19922944: 67109120,
                    20971520: 256,
                    22020096: 67174660,
                    23068672: 67108868,
                    24117248: 0,
                    25165824: 67109124,
                    26214400: 67108864,
                    27262976: 4,
                    28311552: 65792,
                    29360128: 67174400,
                    30408704: 260,
                    31457280: 65796,
                    32505856: 67174404,
                    17301504: 67108864,
                    18350080: 260,
                    19398656: 67174656,
                    20447232: 0,
                    21495808: 65540,
                    22544384: 67109120,
                    23592960: 256,
                    24641536: 67174404,
                    25690112: 65536,
                    26738688: 67174660,
                    27787264: 65796,
                    28835840: 67108868,
                    29884416: 67109124,
                    30932992: 67174400,
                    31981568: 4,
                    33030144: 65792
                }, {
                    0: 2151682048,
                    65536: 2147487808,
                    131072: 4198464,
                    196608: 2151677952,
                    262144: 0,
                    327680: 4198400,
                    393216: 2147483712,
                    458752: 4194368,
                    524288: 2147483648,
                    589824: 4194304,
                    655360: 64,
                    720896: 2147487744,
                    786432: 2151678016,
                    851968: 4160,
                    917504: 4096,
                    983040: 2151682112,
                    32768: 2147487808,
                    98304: 64,
                    163840: 2151678016,
                    229376: 2147487744,
                    294912: 4198400,
                    360448: 2151682112,
                    425984: 0,
                    491520: 2151677952,
                    557056: 4096,
                    622592: 2151682048,
                    688128: 4194304,
                    753664: 4160,
                    819200: 2147483648,
                    884736: 4194368,
                    950272: 4198464,
                    1015808: 2147483712,
                    1048576: 4194368,
                    1114112: 4198400,
                    1179648: 2147483712,
                    1245184: 0,
                    1310720: 4160,
                    1376256: 2151678016,
                    1441792: 2151682048,
                    1507328: 2147487808,
                    1572864: 2151682112,
                    1638400: 2147483648,
                    1703936: 2151677952,
                    1769472: 4198464,
                    1835008: 2147487744,
                    1900544: 4194304,
                    1966080: 64,
                    2031616: 4096,
                    1081344: 2151677952,
                    1146880: 2151682112,
                    1212416: 0,
                    1277952: 4198400,
                    1343488: 4194368,
                    1409024: 2147483648,
                    1474560: 2147487808,
                    1540096: 64,
                    1605632: 2147483712,
                    1671168: 4096,
                    1736704: 2147487744,
                    1802240: 2151678016,
                    1867776: 4160,
                    1933312: 2151682048,
                    1998848: 4194304,
                    2064384: 4198464
                }, {
                    0: 128,
                    4096: 17039360,
                    8192: 262144,
                    12288: 536870912,
                    16384: 537133184,
                    20480: 16777344,
                    24576: 553648256,
                    28672: 262272,
                    32768: 16777216,
                    36864: 537133056,
                    40960: 536871040,
                    45056: 553910400,
                    49152: 553910272,
                    53248: 0,
                    57344: 17039488,
                    61440: 553648128,
                    2048: 17039488,
                    6144: 553648256,
                    10240: 128,
                    14336: 17039360,
                    18432: 262144,
                    22528: 537133184,
                    26624: 553910272,
                    30720: 536870912,
                    34816: 537133056,
                    38912: 0,
                    43008: 553910400,
                    47104: 16777344,
                    51200: 536871040,
                    55296: 553648128,
                    59392: 16777216,
                    63488: 262272,
                    65536: 262144,
                    69632: 128,
                    73728: 536870912,
                    77824: 553648256,
                    81920: 16777344,
                    86016: 553910272,
                    90112: 537133184,
                    94208: 16777216,
                    98304: 553910400,
                    102400: 553648128,
                    106496: 17039360,
                    110592: 537133056,
                    114688: 262272,
                    118784: 536871040,
                    122880: 0,
                    126976: 17039488,
                    67584: 553648256,
                    71680: 16777216,
                    75776: 17039360,
                    79872: 537133184,
                    83968: 536870912,
                    88064: 17039488,
                    92160: 128,
                    96256: 553910272,
                    100352: 262272,
                    104448: 553910400,
                    108544: 0,
                    112640: 553648128,
                    116736: 16777344,
                    120832: 262144,
                    124928: 537133056,
                    129024: 536871040
                }, {
                    0: 268435464,
                    256: 8192,
                    512: 270532608,
                    768: 270540808,
                    1024: 268443648,
                    1280: 2097152,
                    1536: 2097160,
                    1792: 268435456,
                    2048: 0,
                    2304: 268443656,
                    2560: 2105344,
                    2816: 8,
                    3072: 270532616,
                    3328: 2105352,
                    3584: 8200,
                    3840: 270540800,
                    128: 270532608,
                    384: 270540808,
                    640: 8,
                    896: 2097152,
                    1152: 2105352,
                    1408: 268435464,
                    1664: 268443648,
                    1920: 8200,
                    2176: 2097160,
                    2432: 8192,
                    2688: 268443656,
                    2944: 270532616,
                    3200: 0,
                    3456: 270540800,
                    3712: 2105344,
                    3968: 268435456,
                    4096: 268443648,
                    4352: 270532616,
                    4608: 270540808,
                    4864: 8200,
                    5120: 2097152,
                    5376: 268435456,
                    5632: 268435464,
                    5888: 2105344,
                    6144: 2105352,
                    6400: 0,
                    6656: 8,
                    6912: 270532608,
                    7168: 8192,
                    7424: 268443656,
                    7680: 270540800,
                    7936: 2097160,
                    4224: 8,
                    4480: 2105344,
                    4736: 2097152,
                    4992: 268435464,
                    5248: 268443648,
                    5504: 8200,
                    5760: 270540808,
                    6016: 270532608,
                    6272: 270540800,
                    6528: 270532616,
                    6784: 8192,
                    7040: 2105352,
                    7296: 2097160,
                    7552: 0,
                    7808: 268435456,
                    8064: 268443656
                }, {
                    0: 1048576,
                    16: 33555457,
                    32: 1024,
                    48: 1049601,
                    64: 34604033,
                    80: 0,
                    96: 1,
                    112: 34603009,
                    128: 33555456,
                    144: 1048577,
                    160: 33554433,
                    176: 34604032,
                    192: 34603008,
                    208: 1025,
                    224: 1049600,
                    240: 33554432,
                    8: 34603009,
                    24: 0,
                    40: 33555457,
                    56: 34604032,
                    72: 1048576,
                    88: 33554433,
                    104: 33554432,
                    120: 1025,
                    136: 1049601,
                    152: 33555456,
                    168: 34603008,
                    184: 1048577,
                    200: 1024,
                    216: 34604033,
                    232: 1,
                    248: 1049600,
                    256: 33554432,
                    272: 1048576,
                    288: 33555457,
                    304: 34603009,
                    320: 1048577,
                    336: 33555456,
                    352: 34604032,
                    368: 1049601,
                    384: 1025,
                    400: 34604033,
                    416: 1049600,
                    432: 1,
                    448: 0,
                    464: 34603008,
                    480: 33554433,
                    496: 1024,
                    264: 1049600,
                    280: 33555457,
                    296: 34603009,
                    312: 1,
                    328: 33554432,
                    344: 1048576,
                    360: 1025,
                    376: 34604032,
                    392: 33554433,
                    408: 34603008,
                    424: 0,
                    440: 34604033,
                    456: 1049601,
                    472: 1024,
                    488: 33555456,
                    504: 1048577
                }, {
                    0: 134219808,
                    1: 131072,
                    2: 134217728,
                    3: 32,
                    4: 131104,
                    5: 134350880,
                    6: 134350848,
                    7: 2048,
                    8: 134348800,
                    9: 134219776,
                    10: 133120,
                    11: 134348832,
                    12: 2080,
                    13: 0,
                    14: 134217760,
                    15: 133152,
                    2147483648: 2048,
                    2147483649: 134350880,
                    2147483650: 134219808,
                    2147483651: 134217728,
                    2147483652: 134348800,
                    2147483653: 133120,
                    2147483654: 133152,
                    2147483655: 32,
                    2147483656: 134217760,
                    2147483657: 2080,
                    2147483658: 131104,
                    2147483659: 134350848,
                    2147483660: 0,
                    2147483661: 134348832,
                    2147483662: 134219776,
                    2147483663: 131072,
                    16: 133152,
                    17: 134350848,
                    18: 32,
                    19: 2048,
                    20: 134219776,
                    21: 134217760,
                    22: 134348832,
                    23: 131072,
                    24: 0,
                    25: 131104,
                    26: 134348800,
                    27: 134219808,
                    28: 134350880,
                    29: 133120,
                    30: 2080,
                    31: 134217728,
                    2147483664: 131072,
                    2147483665: 2048,
                    2147483666: 134348832,
                    2147483667: 133152,
                    2147483668: 32,
                    2147483669: 134348800,
                    2147483670: 134217728,
                    2147483671: 134219808,
                    2147483672: 134350880,
                    2147483673: 134217760,
                    2147483674: 134219776,
                    2147483675: 0,
                    2147483676: 133120,
                    2147483677: 2080,
                    2147483678: 131104,
                    2147483679: 134350848
                }]
                  , d = [4160749569, 528482304, 33030144, 2064384, 129024, 8064, 504, 2147483679]
                  , c = n.DES = a.extend({
                    _doReset: function() {
                        for (var t = this._key.words, e = [], r = 0; r < 56; r++) {
                            var i = o[r] - 1;
                            e[r] = t[i >>> 5] >>> 31 - i % 32 & 1
                        }
                        for (var a = this._subKeys = [], n = 0; n < 16; n++) {
                            var u = a[n] = []
                              , d = l[n];
                            for (r = 0; r < 24; r++)
                                u[r / 6 | 0] |= e[(s[r] - 1 + d) % 28] << 31 - r % 6,
                                u[4 + (r / 6 | 0)] |= e[28 + (s[r + 24] - 1 + d) % 28] << 31 - r % 6;
                            for (u[0] = u[0] << 1 | u[0] >>> 31,
                            r = 1; r < 7; r++)
                                u[r] = u[r] >>> 4 * (r - 1) + 3;
                            u[7] = u[7] << 5 | u[7] >>> 27
                        }
                        var c = this._invSubKeys = [];
                        for (r = 0; r < 16; r++)
                            c[r] = a[15 - r]
                    },
                    encryptBlock: function(t, e) {
                        this._doCryptBlock(t, e, this._subKeys)
                    },
                    decryptBlock: function(t, e) {
                        this._doCryptBlock(t, e, this._invSubKeys)
                    },
                    _doCryptBlock: function(t, e, r) {
                        this._lBlock = t[e],
                        this._rBlock = t[e + 1],
                        f.call(this, 4, 252645135),
                        f.call(this, 16, 65535),
                        h.call(this, 2, 858993459),
                        h.call(this, 8, 16711935),
                        f.call(this, 1, 1431655765);
                        for (var i = 0; i < 16; i++) {
                            for (var a = r[i], n = this._lBlock, o = this._rBlock, s = 0, l = 0; l < 8; l++)
                                s |= u[l][((o ^ a[l]) & d[l]) >>> 0];
                            this._lBlock = o,
                            this._rBlock = n ^ s
                        }
                        var c = this._lBlock;
                        this._lBlock = this._rBlock,
                        this._rBlock = c,
                        f.call(this, 1, 1431655765),
                        h.call(this, 8, 16711935),
                        h.call(this, 2, 858993459),
                        f.call(this, 16, 65535),
                        f.call(this, 4, 252645135),
                        t[e] = this._lBlock,
                        t[e + 1] = this._rBlock
                    },
                    keySize: 2,
                    ivSize: 2,
                    blockSize: 2
                });
                function f(t, e) {
                    var r = (this._lBlock >>> t ^ this._rBlock) & e;
                    this._rBlock ^= r,
                    this._lBlock ^= r << t
                }
                function h(t, e) {
                    var r = (this._rBlock >>> t ^ this._lBlock) & e;
                    this._lBlock ^= r,
                    this._rBlock ^= r << t
                }
                e.DES = a._createHelper(c);
                var p = n.TripleDES = a.extend({
                    _doReset: function() {
                        var t = this._key.words;
                        this._des1 = c.createEncryptor(i.create(t.slice(0, 2))),
                        this._des2 = c.createEncryptor(i.create(t.slice(2, 4))),
                        this._des3 = c.createEncryptor(i.create(t.slice(4, 6)))
                    },
                    encryptBlock: function(t, e) {
                        this._des1.encryptBlock(t, e),
                        this._des2.decryptBlock(t, e),
                        this._des3.encryptBlock(t, e)
                    },
                    decryptBlock: function(t, e) {
                        this._des3.decryptBlock(t, e),
                        this._des2.encryptBlock(t, e),
                        this._des1.decryptBlock(t, e)
                    },
                    keySize: 6,
                    ivSize: 2,
                    blockSize: 2
                });
                e.TripleDES = a._createHelper(p)
            }(),
            function() {
                var e = t
                  , r = e.lib.StreamCipher
                  , i = e.algo
                  , a = i.RC4 = r.extend({
                    _doReset: function() {
                        for (var t = this._key, e = t.words, r = t.sigBytes, i = this._S = [], a = 0; a < 256; a++)
                            i[a] = a;
                        a = 0;
                        for (var n = 0; a < 256; a++) {
                            var o = a % r
                              , s = e[o >>> 2] >>> 24 - o % 4 * 8 & 255;
                            n = (n + i[a] + s) % 256;
                            var l = i[a];
                            i[a] = i[n],
                            i[n] = l
                        }
                        this._i = this._j = 0
                    },
                    _doProcessBlock: function(t, e) {
                        t[e] ^= n.call(this)
                    },
                    keySize: 8,
                    ivSize: 0
                });
                function n() {
                    for (var t = this._S, e = this._i, r = this._j, i = 0, a = 0; a < 4; a++) {
                        r = (r + t[e = (e + 1) % 256]) % 256;
                        var n = t[e];
                        t[e] = t[r],
                        t[r] = n,
                        i |= t[(t[e] + t[r]) % 256] << 24 - 8 * a
                    }
                    return this._i = e,
                    this._j = r,
                    i
                }
                e.RC4 = r._createHelper(a);
                var o = i.RC4Drop = a.extend({
                    cfg: a.cfg.extend({
                        drop: 192
                    }),
                    _doReset: function() {
                        a._doReset.call(this);
                        for (var t = this.cfg.drop; t > 0; t--)
                            n.call(this)
                    }
                });
                e.RC4Drop = r._createHelper(o)
            }(),
            t.mode.CTRGladman = function() {
                var e = t.lib.BlockCipherMode.extend();
                function r(t) {
                    if (255 == (t >> 24 & 255)) {
                        var e = t >> 16 & 255
                          , r = t >> 8 & 255
                          , i = 255 & t;
                        255 === e ? (e = 0,
                        255 === r ? (r = 0,
                        255 === i ? i = 0 : ++i) : ++r) : ++e,
                        t = 0,
                        t += e << 16,
                        t += r << 8,
                        t += i
                    } else
                        t += 1 << 24;
                    return t
                }
                var i = e.Encryptor = e.extend({
                    processBlock: function(t, e) {
                        var i = this._cipher
                          , a = i.blockSize
                          , n = this._iv
                          , o = this._counter;
                        n && (o = this._counter = n.slice(0),
                        this._iv = void 0),
                        function(t) {
                            0 === (t[0] = r(t[0])) && (t[1] = r(t[1]))
                        }(o);
                        var s = o.slice(0);
                        i.encryptBlock(s, 0);
                        for (var l = 0; l < a; l++)
                            t[e + l] ^= s[l]
                    }
                });
                return e.Decryptor = i,
                e
            }(),
            function() {
                var e = t
                  , r = e.lib.StreamCipher
                  , i = []
                  , a = []
                  , n = []
                  , o = e.algo.Rabbit = r.extend({
                    _doReset: function() {
                        for (var t = this._key.words, e = this.cfg.iv, r = 0; r < 4; r++)
                            t[r] = 16711935 & (t[r] << 8 | t[r] >>> 24) | 4278255360 & (t[r] << 24 | t[r] >>> 8);
                        var i = this._X = [t[0], t[3] << 16 | t[2] >>> 16, t[1], t[0] << 16 | t[3] >>> 16, t[2], t[1] << 16 | t[0] >>> 16, t[3], t[2] << 16 | t[1] >>> 16]
                          , a = this._C = [t[2] << 16 | t[2] >>> 16, 4294901760 & t[0] | 65535 & t[1], t[3] << 16 | t[3] >>> 16, 4294901760 & t[1] | 65535 & t[2], t[0] << 16 | t[0] >>> 16, 4294901760 & t[2] | 65535 & t[3], t[1] << 16 | t[1] >>> 16, 4294901760 & t[3] | 65535 & t[0]];
                        for (this._b = 0,
                        r = 0; r < 4; r++)
                            s.call(this);
                        for (r = 0; r < 8; r++)
                            a[r] ^= i[r + 4 & 7];
                        if (e) {
                            var n = e.words
                              , o = n[0]
                              , l = n[1]
                              , u = 16711935 & (o << 8 | o >>> 24) | 4278255360 & (o << 24 | o >>> 8)
                              , d = 16711935 & (l << 8 | l >>> 24) | 4278255360 & (l << 24 | l >>> 8)
                              , c = u >>> 16 | 4294901760 & d
                              , f = d << 16 | 65535 & u;
                            for (a[0] ^= u,
                            a[1] ^= c,
                            a[2] ^= d,
                            a[3] ^= f,
                            a[4] ^= u,
                            a[5] ^= c,
                            a[6] ^= d,
                            a[7] ^= f,
                            r = 0; r < 4; r++)
                                s.call(this)
                        }
                    },
                    _doProcessBlock: function(t, e) {
                        var r = this._X;
                        s.call(this),
                        i[0] = r[0] ^ r[5] >>> 16 ^ r[3] << 16,
                        i[1] = r[2] ^ r[7] >>> 16 ^ r[5] << 16,
                        i[2] = r[4] ^ r[1] >>> 16 ^ r[7] << 16,
                        i[3] = r[6] ^ r[3] >>> 16 ^ r[1] << 16;
                        for (var a = 0; a < 4; a++)
                            i[a] = 16711935 & (i[a] << 8 | i[a] >>> 24) | 4278255360 & (i[a] << 24 | i[a] >>> 8),
                            t[e + a] ^= i[a]
                    },
                    blockSize: 4,
                    ivSize: 2
                });
                function s() {
                    for (var t = this._X, e = this._C, r = 0; r < 8; r++)
                        a[r] = e[r];
                    for (e[0] = e[0] + 1295307597 + this._b | 0,
                    e[1] = e[1] + 3545052371 + (e[0] >>> 0 < a[0] >>> 0 ? 1 : 0) | 0,
                    e[2] = e[2] + 886263092 + (e[1] >>> 0 < a[1] >>> 0 ? 1 : 0) | 0,
                    e[3] = e[3] + 1295307597 + (e[2] >>> 0 < a[2] >>> 0 ? 1 : 0) | 0,
                    e[4] = e[4] + 3545052371 + (e[3] >>> 0 < a[3] >>> 0 ? 1 : 0) | 0,
                    e[5] = e[5] + 886263092 + (e[4] >>> 0 < a[4] >>> 0 ? 1 : 0) | 0,
                    e[6] = e[6] + 1295307597 + (e[5] >>> 0 < a[5] >>> 0 ? 1 : 0) | 0,
                    e[7] = e[7] + 3545052371 + (e[6] >>> 0 < a[6] >>> 0 ? 1 : 0) | 0,
                    this._b = e[7] >>> 0 < a[7] >>> 0 ? 1 : 0,
                    r = 0; r < 8; r++) {
                        var i = t[r] + e[r]
                          , o = 65535 & i
                          , s = i >>> 16
                          , l = ((o * o >>> 17) + o * s >>> 15) + s * s
                          , u = ((4294901760 & i) * i | 0) + ((65535 & i) * i | 0);
                        n[r] = l ^ u
                    }
                    t[0] = n[0] + (n[7] << 16 | n[7] >>> 16) + (n[6] << 16 | n[6] >>> 16) | 0,
                    t[1] = n[1] + (n[0] << 8 | n[0] >>> 24) + n[7] | 0,
                    t[2] = n[2] + (n[1] << 16 | n[1] >>> 16) + (n[0] << 16 | n[0] >>> 16) | 0,
                    t[3] = n[3] + (n[2] << 8 | n[2] >>> 24) + n[1] | 0,
                    t[4] = n[4] + (n[3] << 16 | n[3] >>> 16) + (n[2] << 16 | n[2] >>> 16) | 0,
                    t[5] = n[5] + (n[4] << 8 | n[4] >>> 24) + n[3] | 0,
                    t[6] = n[6] + (n[5] << 16 | n[5] >>> 16) + (n[4] << 16 | n[4] >>> 16) | 0,
                    t[7] = n[7] + (n[6] << 8 | n[6] >>> 24) + n[5] | 0
                }
                e.Rabbit = r._createHelper(o)
            }(),
            t.mode.CTR = function() {
                var e = t.lib.BlockCipherMode.extend()
                  , r = e.Encryptor = e.extend({
                    processBlock: function(t, e) {
                        var r = this._cipher
                          , i = r.blockSize
                          , a = this._iv
                          , n = this._counter;
                        a && (n = this._counter = a.slice(0),
                        this._iv = void 0);
                        var o = n.slice(0);
                        r.encryptBlock(o, 0),
                        n[i - 1] = n[i - 1] + 1 | 0;
                        for (var s = 0; s < i; s++)
                            t[e + s] ^= o[s]
                    }
                });
                return e.Decryptor = r,
                e
            }(),
            function() {
                var e = t
                  , r = e.lib.StreamCipher
                  , i = []
                  , a = []
                  , n = []
                  , o = e.algo.RabbitLegacy = r.extend({
                    _doReset: function() {
                        var t = this._key.words
                          , e = this.cfg.iv
                          , r = this._X = [t[0], t[3] << 16 | t[2] >>> 16, t[1], t[0] << 16 | t[3] >>> 16, t[2], t[1] << 16 | t[0] >>> 16, t[3], t[2] << 16 | t[1] >>> 16]
                          , i = this._C = [t[2] << 16 | t[2] >>> 16, 4294901760 & t[0] | 65535 & t[1], t[3] << 16 | t[3] >>> 16, 4294901760 & t[1] | 65535 & t[2], t[0] << 16 | t[0] >>> 16, 4294901760 & t[2] | 65535 & t[3], t[1] << 16 | t[1] >>> 16, 4294901760 & t[3] | 65535 & t[0]];
                        this._b = 0;
                        for (var a = 0; a < 4; a++)
                            s.call(this);
                        for (a = 0; a < 8; a++)
                            i[a] ^= r[a + 4 & 7];
                        if (e) {
                            var n = e.words
                              , o = n[0]
                              , l = n[1]
                              , u = 16711935 & (o << 8 | o >>> 24) | 4278255360 & (o << 24 | o >>> 8)
                              , d = 16711935 & (l << 8 | l >>> 24) | 4278255360 & (l << 24 | l >>> 8)
                              , c = u >>> 16 | 4294901760 & d
                              , f = d << 16 | 65535 & u;
                            for (i[0] ^= u,
                            i[1] ^= c,
                            i[2] ^= d,
                            i[3] ^= f,
                            i[4] ^= u,
                            i[5] ^= c,
                            i[6] ^= d,
                            i[7] ^= f,
                            a = 0; a < 4; a++)
                                s.call(this)
                        }
                    },
                    _doProcessBlock: function(t, e) {
                        var r = this._X;
                        s.call(this),
                        i[0] = r[0] ^ r[5] >>> 16 ^ r[3] << 16,
                        i[1] = r[2] ^ r[7] >>> 16 ^ r[5] << 16,
                        i[2] = r[4] ^ r[1] >>> 16 ^ r[7] << 16,
                        i[3] = r[6] ^ r[3] >>> 16 ^ r[1] << 16;
                        for (var a = 0; a < 4; a++)
                            i[a] = 16711935 & (i[a] << 8 | i[a] >>> 24) | 4278255360 & (i[a] << 24 | i[a] >>> 8),
                            t[e + a] ^= i[a]
                    },
                    blockSize: 4,
                    ivSize: 2
                });
                function s() {
                    for (var t = this._X, e = this._C, r = 0; r < 8; r++)
                        a[r] = e[r];
                    for (e[0] = e[0] + 1295307597 + this._b | 0,
                    e[1] = e[1] + 3545052371 + (e[0] >>> 0 < a[0] >>> 0 ? 1 : 0) | 0,
                    e[2] = e[2] + 886263092 + (e[1] >>> 0 < a[1] >>> 0 ? 1 : 0) | 0,
                    e[3] = e[3] + 1295307597 + (e[2] >>> 0 < a[2] >>> 0 ? 1 : 0) | 0,
                    e[4] = e[4] + 3545052371 + (e[3] >>> 0 < a[3] >>> 0 ? 1 : 0) | 0,
                    e[5] = e[5] + 886263092 + (e[4] >>> 0 < a[4] >>> 0 ? 1 : 0) | 0,
                    e[6] = e[6] + 1295307597 + (e[5] >>> 0 < a[5] >>> 0 ? 1 : 0) | 0,
                    e[7] = e[7] + 3545052371 + (e[6] >>> 0 < a[6] >>> 0 ? 1 : 0) | 0,
                    this._b = e[7] >>> 0 < a[7] >>> 0 ? 1 : 0,
                    r = 0; r < 8; r++) {
                        var i = t[r] + e[r]
                          , o = 65535 & i
                          , s = i >>> 16
                          , l = ((o * o >>> 17) + o * s >>> 15) + s * s
                          , u = ((4294901760 & i) * i | 0) + ((65535 & i) * i | 0);
                        n[r] = l ^ u
                    }
                    t[0] = n[0] + (n[7] << 16 | n[7] >>> 16) + (n[6] << 16 | n[6] >>> 16) | 0,
                    t[1] = n[1] + (n[0] << 8 | n[0] >>> 24) + n[7] | 0,
                    t[2] = n[2] + (n[1] << 16 | n[1] >>> 16) + (n[0] << 16 | n[0] >>> 16) | 0,
                    t[3] = n[3] + (n[2] << 8 | n[2] >>> 24) + n[1] | 0,
                    t[4] = n[4] + (n[3] << 16 | n[3] >>> 16) + (n[2] << 16 | n[2] >>> 16) | 0,
                    t[5] = n[5] + (n[4] << 8 | n[4] >>> 24) + n[3] | 0,
                    t[6] = n[6] + (n[5] << 16 | n[5] >>> 16) + (n[4] << 16 | n[4] >>> 16) | 0,
                    t[7] = n[7] + (n[6] << 8 | n[6] >>> 24) + n[5] | 0
                }
                e.RabbitLegacy = r._createHelper(o)
            }(),
            t.pad.ZeroPadding = {
                pad: function(t, e) {
                    var r = 4 * e;
                    t.clamp(),
                    t.sigBytes += r - (t.sigBytes % r || r)
                },
                unpad: function(t) {
                    for (var e = t.words, r = t.sigBytes - 1; !(e[r >>> 2] >>> 24 - r % 4 * 8 & 255); )
                        r--;
                    t.sigBytes = r + 1
                }
            },
            t
        }()
    }
    , function(t, e) {
        var r = ["s", "i", "y", "u", "a", "n", "t", "l", "w", "x"]
          , i = [function(t) {
            return t
        }
        , function(t, r, i) {
            i = i || "eDu_51Cto_siyuanTlw";
            for (var a = e.base64decode(t).split(""), n = e.MD5(r + i).toString(), o = n.length - 1; o >= 0; o--) {
                var s = n[o].charCodeAt() % (a.length - 1);
                a.splice(s, 1)
            }
            return a.join("")
        }
        , function(t, r, i) {
            for (var a = r % 7, n = t.length, o = "", s = 0; s < n / 2; s++) {
                var l = 2 * s;
                o += 0 == a || s % a == 0 ? t[l] + t[l + 1] : t[l + 1] ? t[l + 1] + t[l] : t[l]
            }
            var u = e.base64decode(o)
              , d = (u.length - 1) / 2
              , c = "";
            for (s = 0; s < d; s++) {
                l = 2 * s;
                s > a && l++,
                c += s % 3 == 0 ? u[l] : u[l + 1]
            }
            return c
        }
        , function(t) {
            return t
        }
        , function(t) {
            return t
        }
        , function(t, r, i) {
            var a, n, o, s, l, u, d, c = t.slice(0, 7) + t.slice(10, 12) + t.slice(15, -3), f = "", h = 0, p = 0, g = "";
            c = c.split("").reverse().join(""),
            a = e.eeb64(c),
            n = parseInt(a.substr(0, 1)),
            s = (o = a.slice(6, -3)).match(/^\d*/),
            l = o.match(/\d*$/),
            u = s[0],
            d = l[0],
            o = o.replace(/^\d*/, "").replace(/\d*$/, "");
            for (var v = 0; v < d.length; v++)
                f += e.bu(parseInt(d[v]).toString(2), 3);
            f = f.substr(n);
            for (v = 0; v < f.length; v++)
                1 == f[v] ? (g += u[p],
                p++) : (g += o[h],
                h++);
            return g
        }
        , function(t, r, i) {
            for (var a, n = {
                B: "0",
                q: "1",
                r: "2",
                C: "3",
                w: "4",
                x: "5",
                V: "6",
                e: "7",
                f: "8",
                D: "9",
                9: "a",
                4: "b",
                5: "c",
                7: "d",
                m: "e",
                n: "f",
                o: "g",
                H: "h",
                I: "i",
                N: "j",
                O: "k",
                P: "l",
                Q: "m",
                R: "n",
                S: "o",
                U: "p",
                X: "q",
                L: "r",
                M: "s",
                a: "t",
                b: "u",
                F: "v",
                c: "w",
                d: "x",
                g: "y",
                h: "z",
                i: "A",
                j: "B",
                y: "C",
                z: "D",
                k: "E",
                l: "F",
                6: "G",
                G: "H",
                A: "I",
                p: "J",
                s: "K",
                t: "L",
                u: "M",
                J: "N",
                K: "O",
                v: "P",
                W: "Q",
                0: "R",
                Y: "S",
                Z: "T",
                2: "U",
                3: "V",
                E: "W",
                T: "X",
                8: "Y",
                1: "Z"
            }, o = 5, s = "", l = 0, u = "", d = 0, c = 0; c < t.length; c++) {
                var f = t[c];
                s += n[f] ? n[f] : f
            }
            for (c = 0; c < 8; c++)
                a = 7 == c ? 32 - d : Math.abs(8 - o++),
                u += s.substr(l++, 1),
                l += a,
                d += a;
            return u += s.substr(40),
            e.eeb64(u.split("").reverse().join(""))
        }
        , function(t, r, i) {
            i = i || "eDu_51Cto_siyuanTlw";
            var a = e.eeb64(t)
              , n = e.MD5(i + r).toString().slice(0, 16)
              , o = a.indexOf(n)
              , s = parseInt(a.slice(0, o), 16);
            if (!o)
                return !1;
            var l = a.substr(16 + o);
            return l.length == s && l
        }
        ];
        e.bu = function(t, e) {
            for (var r = e - (t += "").length; r > 0; r--)
                t = "0" + t;
            return t
        }
        ,
        e.MD5 = function(t) {
            var e = 0
              , r = 8;
            function i(t) {
                return f(a(c(t), t.length * r))
            }
            function a(t, e) {
                t[e >> 5] |= 128 << e % 32,
                t[14 + (e + 64 >>> 9 << 4)] = e;
                for (var r = 1732584193, i = -271733879, a = -1732584194, n = 271733878, c = 0; c < t.length; c += 16) {
                    var f = r
                      , h = i
                      , p = a
                      , g = n;
                    i = u(i = u(i = u(i = u(i = l(i = l(i = l(i = l(i = s(i = s(i = s(i = s(i = o(i = o(i = o(i = o(i, a = o(a, n = o(n, r = o(r, i, a, n, t[c + 0], 7, -680876936), i, a, t[c + 1], 12, -389564586), r, i, t[c + 2], 17, 606105819), n, r, t[c + 3], 22, -1044525330), a = o(a, n = o(n, r = o(r, i, a, n, t[c + 4], 7, -176418897), i, a, t[c + 5], 12, 1200080426), r, i, t[c + 6], 17, -1473231341), n, r, t[c + 7], 22, -45705983), a = o(a, n = o(n, r = o(r, i, a, n, t[c + 8], 7, 1770035416), i, a, t[c + 9], 12, -1958414417), r, i, t[c + 10], 17, -42063), n, r, t[c + 11], 22, -1990404162), a = o(a, n = o(n, r = o(r, i, a, n, t[c + 12], 7, 1804603682), i, a, t[c + 13], 12, -40341101), r, i, t[c + 14], 17, -1502002290), n, r, t[c + 15], 22, 1236535329), a = s(a, n = s(n, r = s(r, i, a, n, t[c + 1], 5, -165796510), i, a, t[c + 6], 9, -1069501632), r, i, t[c + 11], 14, 643717713), n, r, t[c + 0], 20, -373897302), a = s(a, n = s(n, r = s(r, i, a, n, t[c + 5], 5, -701558691), i, a, t[c + 10], 9, 38016083), r, i, t[c + 15], 14, -660478335), n, r, t[c + 4], 20, -405537848), a = s(a, n = s(n, r = s(r, i, a, n, t[c + 9], 5, 568446438), i, a, t[c + 14], 9, -1019803690), r, i, t[c + 3], 14, -187363961), n, r, t[c + 8], 20, 1163531501), a = s(a, n = s(n, r = s(r, i, a, n, t[c + 13], 5, -1444681467), i, a, t[c + 2], 9, -51403784), r, i, t[c + 7], 14, 1735328473), n, r, t[c + 12], 20, -1926607734), a = l(a, n = l(n, r = l(r, i, a, n, t[c + 5], 4, -378558), i, a, t[c + 8], 11, -2022574463), r, i, t[c + 11], 16, 1839030562), n, r, t[c + 14], 23, -35309556), a = l(a, n = l(n, r = l(r, i, a, n, t[c + 1], 4, -1530992060), i, a, t[c + 4], 11, 1272893353), r, i, t[c + 7], 16, -155497632), n, r, t[c + 10], 23, -1094730640), a = l(a, n = l(n, r = l(r, i, a, n, t[c + 13], 4, 681279174), i, a, t[c + 0], 11, -358537222), r, i, t[c + 3], 16, -722521979), n, r, t[c + 6], 23, 76029189), a = l(a, n = l(n, r = l(r, i, a, n, t[c + 9], 4, -640364487), i, a, t[c + 12], 11, -421815835), r, i, t[c + 15], 16, 530742520), n, r, t[c + 2], 23, -995338651), a = u(a, n = u(n, r = u(r, i, a, n, t[c + 0], 6, -198630844), i, a, t[c + 7], 10, 1126891415), r, i, t[c + 14], 15, -1416354905), n, r, t[c + 5], 21, -57434055), a = u(a, n = u(n, r = u(r, i, a, n, t[c + 12], 6, 1700485571), i, a, t[c + 3], 10, -1894986606), r, i, t[c + 10], 15, -1051523), n, r, t[c + 1], 21, -2054922799), a = u(a, n = u(n, r = u(r, i, a, n, t[c + 8], 6, 1873313359), i, a, t[c + 15], 10, -30611744), r, i, t[c + 6], 15, -1560198380), n, r, t[c + 13], 21, 1309151649), a = u(a, n = u(n, r = u(r, i, a, n, t[c + 4], 6, -145523070), i, a, t[c + 11], 10, -1120210379), r, i, t[c + 2], 15, 718787259), n, r, t[c + 9], 21, -343485551),
                    r = d(r, f),
                    i = d(i, h),
                    a = d(a, p),
                    n = d(n, g)
                }
                return Array(r, i, a, n)
            }
            function n(t, e, r, i, a, n) {
                return d(function(t, e) {
                    return t << e | t >>> 32 - e
                }(d(d(e, t), d(i, n)), a), r)
            }
            function o(t, e, r, i, a, o, s) {
                return n(e & r | ~e & i, t, e, a, o, s)
            }
            function s(t, e, r, i, a, o, s) {
                return n(e & i | r & ~i, t, e, a, o, s)
            }
            function l(t, e, r, i, a, o, s) {
                return n(e ^ r ^ i, t, e, a, o, s)
            }
            function u(t, e, r, i, a, o, s) {
                return n(r ^ (e | ~i), t, e, a, o, s)
            }
            function d(t, e) {
                var r = (65535 & t) + (65535 & e);
                return (t >> 16) + (e >> 16) + (r >> 16) << 16 | 65535 & r
            }
            function c(t) {
                for (var e = Array(), i = (1 << r) - 1, a = 0; a < t.length * r; a += r)
                    e[a >> 5] |= (t.charCodeAt(a / r) & i) << a % 32;
                return e
            }
            function f(t) {
                for (var r = e ? "0123456789ABCDEF" : "0123456789abcdef", i = "", a = 0; a < 4 * t.length; a++)
                    i += r.charAt(t[a >> 2] >> a % 4 * 8 + 4 & 15) + r.charAt(t[a >> 2] >> a % 4 * 8 & 15);
                return i
            }
            return i(t)
        }
        ,
        e.eeb64 = function(t) {
            for (var r = "", i = "", a = 0; a < t.length; a++)
                r += e.bu("BqrCwxVefD9457mnoHINOPQRSUXLMabFcdghijyzkl6GApstuJKvW0YZ23ET81=_".indexOf(t[a]).toString(2), 6);
            r = r.substring(r.length % 8);
            for (a = 0; a < Math.ceil(r.length / 8); a++)
                i += String.fromCharCode(parseInt(r.substr(8 * a, 8), 2));
            return e.base64decode(i)
        }
        ,
        e.dec = function(t, e) {
            function a(t) {
                for (var e = 0; e < r.length; e++)
                    if (r[e] == t)
                        return e
            }
            t[1];
            var n = [i[a(t[13])], i[a(t[8])], i[a(t[4])]]
              , o = t.substr(0, 1) + t.substr(2, 2) + t.substr(5, 3) + t.substr(9, 4) + t.substr(14);
            for (var s in n)
                o = n[s](o, e);
            return o
        }
        ,
        e.base64decode = function(t) {
            var e, r, i, a, n, o, s, l = new Array(-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,62,-1,-1,-1,63,52,53,54,55,56,57,58,59,60,61,-1,-1,-1,-1,-1,-1,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,-1,-1,-1,-1,-1,-1,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,-1,-1,-1,-1,-1);
            for (o = t.length,
            n = 0,
            s = ""; n < o; ) {
                do {
                    e = l[255 & t.charCodeAt(n++)]
                } while (n < o && -1 == e);if (-1 == e)
                    break;
                do {
                    r = l[255 & t.charCodeAt(n++)]
                } while (n < o && -1 == r);if (-1 == r)
                    break;
                s += String.fromCharCode(e << 2 | (48 & r) >> 4);
                do {
                    if (61 == (i = 255 & t.charCodeAt(n++)))
                        return s;
                    i = l[i]
                } while (n < o && -1 == i);if (-1 == i)
                    break;
                s += String.fromCharCode((15 & r) << 4 | (60 & i) >> 2);
                do {
                    if (61 == (a = 255 & t.charCodeAt(n++)))
                        return s;
                    a = l[a]
                } while (n < o && -1 == a);if (-1 == a)
                    break;
                s += String.fromCharCode((3 & i) << 6 | a)
            }
            return s
        }
        ,
        e.base64ToArrayBuffer = function(t) {
            for (var e = atob(t), r = e.length, i = new Uint8Array(r), a = 0; a < r; a++)
                i[a] = e.charCodeAt(a);
            return i.buffer
        }
        ,
        e.arrayBufferToBase64 = function(t) {
            for (var e = "", r = new Uint8Array(t), i = r.byteLength, a = 0; a < i; a++)
                e += String.fromCharCode(r[a]);
            return btoa(e)
        }
    }
    , function(t, e, r) {
        "use strict";
        (function(t) {
            Object.defineProperty(e, "__esModule", {
                value: !0
            });
            var i = r(22)
              , a = r(0)
              , n = r(9)
              , o = function() {
                function e(t, e, r) {
                    this.observer = t,
                    this.config = r,
                    this.remuxer = e
                }
                return e.prototype.resetInitSegment = function(t, e, r, i) {
                    this._audioTrack = {
                        container: "audio/adts",
                        type: "audio",
                        id: 0,
                        sequenceNumber: 0,
                        isAAC: !0,
                        samples: [],
                        len: 0,
                        manifestCodec: e,
                        duration: i,
                        inputTimeScale: 9e4
                    }
                }
                ,
                e.prototype.resetTimeStamp = function() {}
                ,
                e.probe = function(t) {
                    if (!t)
                        return !1;
                    for (var e = (n.default.getID3Data(t, 0) || []).length, r = t.length; e < r; e++)
                        if (i.probe(t, e))
                            return a.logger.log("ADTS sync word found !"),
                            !0;
                    return !1
                }
                ,
                e.prototype.append = function(e, r, o, s) {
                    for (var l = this._audioTrack, u = n.default.getID3Data(e, 0) || [], d = n.default.getTimeStamp(u), c = t.isFinite(d) ? 90 * d : 9e4 * r, f = 0, h = c, p = e.length, g = u.length, v = [{
                        pts: h,
                        dts: h,
                        data: u
                    }]; g < p - 1; )
                        if (i.isHeader(e, g) && g + 5 < p) {
                            i.initTrackConfig(l, this.observer, e, g, l.manifestCodec);
                            var y = i.appendFrame(l, e, g, c, f);
                            if (!y) {
                                a.logger.log("Unable to parse AAC frame");
                                break
                            }
                            g += y.length,
                            h = y.sample.pts,
                            f++
                        } else
                            n.default.isHeader(e, g) ? (u = n.default.getID3Data(e, g),
                            v.push({
                                pts: h,
                                dts: h,
                                data: u
                            }),
                            g += u.length) : g++;
                    this.remuxer.remux(l, {
                        samples: []
                    }, {
                        samples: v,
                        inputTimeScale: 9e4
                    }, {
                        samples: []
                    }, r, o, s)
                }
                ,
                e.prototype.destroy = function() {}
                ,
                e
            }();
            e.default = o
        }
        ).call(this, r(3).Number)
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(22)
          , a = r(23)
          , n = r(1)
          , o = r(41)
          , s = r(42)
          , l = r(0)
          , u = r(2)
          , d = {
            video: 1,
            audio: 2,
            id3: 3,
            text: 4
        }
          , c = function() {
            function t(t, e, r, i) {
                this.observer = t,
                this.config = r,
                this.typeSupported = i,
                this.remuxer = e,
                this.sampleAes = null
            }
            return t.prototype.setDecryptData = function(t) {
                null != t && null != t.key && "SAMPLE-AES" === t.method ? this.sampleAes = new s.default(this.observer,this.config,t,this.discardEPB) : this.sampleAes = null
            }
            ,
            t.probe = function(e) {
                var r = t._syncOffset(e);
                return !(r < 0) && (r && l.logger.warn("MPEG2-TS detected but first sync word found @ offset " + r + ", junk ahead ?"),
                !0)
            }
            ,
            t._syncOffset = function(t) {
                for (var e = Math.min(1e3, t.length - 564), r = 0; r < e; ) {
                    if (71 === t[r] && 71 === t[r + 188] && 71 === t[r + 376])
                        return r;
                    r++
                }
                return -1
            }
            ,
            t.createTrack = function(t, e) {
                return {
                    container: "video" === t || "audio" === t ? "video/mp2t" : void 0,
                    type: t,
                    id: d[t],
                    pid: -1,
                    inputTimeScale: 9e4,
                    sequenceNumber: 0,
                    samples: [],
                    len: 0,
                    dropped: "video" === t ? 0 : void 0,
                    isAAC: "audio" === t || void 0,
                    duration: "audio" === t ? e : void 0
                }
            }
            ,
            t.prototype.resetInitSegment = function(e, r, i, a) {
                this.pmtParsed = !1,
                this._pmtId = -1,
                this._avcTrack = t.createTrack("video", a),
                this._audioTrack = t.createTrack("audio", a),
                this._id3Track = t.createTrack("id3", a),
                this._txtTrack = t.createTrack("text", a),
                this.aacOverFlow = null,
                this.aacLastPTS = null,
                this.avcSample = null,
                this.audioCodec = r,
                this.videoCodec = i,
                this._duration = a
            }
            ,
            t.prototype.resetTimeStamp = function() {}
            ,
            t.prototype.append = function(e, r, i, a) {
                var o, s, d, c, f, h = e.length, p = !1;
                this.contiguous = i;
                var g = this.pmtParsed
                  , v = this._avcTrack
                  , y = this._audioTrack
                  , m = this._id3Track
                  , _ = v.pid
                  , E = y.pid
                  , T = m.pid
                  , S = this._pmtId
                  , b = v.pesData
                  , A = y.pesData
                  , R = m.pesData
                  , D = this._parsePAT
                  , L = this._parsePMT
                  , w = this._parsePES
                  , k = this._parseAVCPES.bind(this)
                  , O = this._parseAACPES.bind(this)
                  , I = this._parseMPEGPES.bind(this)
                  , P = this._parseID3PES.bind(this)
                  , C = t._syncOffset(e);
                for (h -= (h + C) % 188,
                o = C; o < h; o += 188)
                    if (71 === e[o]) {
                        if (s = !!(64 & e[o + 1]),
                        d = ((31 & e[o + 1]) << 8) + e[o + 2],
                        (48 & e[o + 3]) >> 4 > 1) {
                            if ((c = o + 5 + e[o + 4]) === o + 188)
                                continue
                        } else
                            c = o + 4;
                        switch (d) {
                        case _:
                            s && (b && (f = w(b)) && void 0 !== f.pts && k(f, !1),
                            b = {
                                data: [],
                                size: 0
                            }),
                            b && (b.data.push(e.subarray(c, o + 188)),
                            b.size += o + 188 - c);
                            break;
                        case E:
                            s && (A && (f = w(A)) && void 0 !== f.pts && (y.isAAC ? O(f) : I(f)),
                            A = {
                                data: [],
                                size: 0
                            }),
                            A && (A.data.push(e.subarray(c, o + 188)),
                            A.size += o + 188 - c);
                            break;
                        case T:
                            s && (R && (f = w(R)) && void 0 !== f.pts && P(f),
                            R = {
                                data: [],
                                size: 0
                            }),
                            R && (R.data.push(e.subarray(c, o + 188)),
                            R.size += o + 188 - c);
                            break;
                        case 0:
                            s && (c += e[c] + 1),
                            S = this._pmtId = D(e, c);
                            break;
                        case S:
                            s && (c += e[c] + 1);
                            var x = L(e, c, !0 === this.typeSupported.mpeg || !0 === this.typeSupported.mp3, null != this.sampleAes);
                            (_ = x.avc) > 0 && (v.pid = _),
                            (E = x.audio) > 0 && (y.pid = E,
                            y.isAAC = x.isAAC),
                            (T = x.id3) > 0 && (m.pid = T),
                            p && !g && (l.logger.log("reparse from beginning"),
                            p = !1,
                            o = C - 188),
                            g = this.pmtParsed = !0;
                            break;
                        case 17:
                        case 8191:
                            break;
                        default:
                            p = !0
                        }
                    } else
                        this.observer.trigger(n.default.ERROR, {
                            type: u.ErrorTypes.MEDIA_ERROR,
                            details: u.ErrorDetails.FRAG_PARSING_ERROR,
                            fatal: !1,
                            reason: "TS packet did not start with 0x47"
                        });
                b && (f = w(b)) && void 0 !== f.pts ? (k(f, !0),
                v.pesData = null) : v.pesData = b,
                A && (f = w(A)) && void 0 !== f.pts ? (y.isAAC ? O(f) : I(f),
                y.pesData = null) : (A && A.size && l.logger.log("last AAC PES packet truncated,might overlap between fragments"),
                y.pesData = A),
                R && (f = w(R)) && void 0 !== f.pts ? (P(f),
                m.pesData = null) : m.pesData = R,
                null == this.sampleAes ? this.remuxer.remux(y, v, m, this._txtTrack, r, i, a) : this.decryptAndRemux(y, v, m, this._txtTrack, r, i, a)
            }
            ,
            t.prototype.decryptAndRemux = function(t, e, r, i, a, n, o) {
                if (t.samples && t.isAAC) {
                    var s = this;
                    this.sampleAes.decryptAacSamples(t.samples, 0, function() {
                        s.decryptAndRemuxAvc(t, e, r, i, a, n, o)
                    })
                } else
                    this.decryptAndRemuxAvc(t, e, r, i, a, n, o)
            }
            ,
            t.prototype.decryptAndRemuxAvc = function(t, e, r, i, a, n, o) {
                if (e.samples) {
                    var s = this;
                    this.sampleAes.decryptAvcSamples(e.samples, 0, 0, function() {
                        s.remuxer.remux(t, e, r, i, a, n, o)
                    })
                } else
                    this.remuxer.remux(t, e, r, i, a, n, o)
            }
            ,
            t.prototype.destroy = function() {
                this._initPTS = this._initDTS = void 0,
                this._duration = 0
            }
            ,
            t.prototype._parsePAT = function(t, e) {
                return (31 & t[e + 10]) << 8 | t[e + 11]
            }
            ,
            t.prototype._parsePMT = function(t, e, r, i) {
                var a, n, o = {
                    audio: -1,
                    avc: -1,
                    id3: -1,
                    isAAC: !0
                };
                for (a = e + 3 + ((15 & t[e + 1]) << 8 | t[e + 2]) - 4,
                e += 12 + ((15 & t[e + 10]) << 8 | t[e + 11]); e < a; ) {
                    switch (n = (31 & t[e + 1]) << 8 | t[e + 2],
                    t[e]) {
                    case 207:
                        if (!i) {
                            l.logger.log("unkown stream type:" + t[e]);
                            break
                        }
                    case 15:
                        -1 === o.audio && (o.audio = n);
                        break;
                    case 21:
                        -1 === o.id3 && (o.id3 = n);
                        break;
                    case 219:
                        if (!i) {
                            l.logger.log("unkown stream type:" + t[e]);
                            break
                        }
                    case 27:
                        -1 === o.avc && (o.avc = n);
                        break;
                    case 3:
                    case 4:
                        r ? -1 === o.audio && (o.audio = n,
                        o.isAAC = !1) : l.logger.log("MPEG audio found, not supported in this browser for now");
                        break;
                    case 36:
                        l.logger.warn("HEVC stream type found, not supported for now");
                        break;
                    default:
                        l.logger.log("unkown stream type:" + t[e])
                    }
                    e += 5 + ((15 & t[e + 3]) << 8 | t[e + 4])
                }
                return o
            }
            ,
            t.prototype._parsePES = function(t) {
                var e, r, i, a, n, o, s, u, d = 0, c = t.data;
                if (!t || 0 === t.size)
                    return null;
                for (; c[0].length < 19 && c.length > 1; ) {
                    var f = new Uint8Array(c[0].length + c[1].length);
                    f.set(c[0]),
                    f.set(c[1], c[0].length),
                    c[0] = f,
                    c.splice(1, 1)
                }
                if (1 === ((e = c[0])[0] << 16) + (e[1] << 8) + e[2]) {
                    if ((i = (e[4] << 8) + e[5]) && i > t.size - 6)
                        return null;
                    192 & (r = e[7]) && ((o = 536870912 * (14 & e[9]) + 4194304 * (255 & e[10]) + 16384 * (254 & e[11]) + 128 * (255 & e[12]) + (254 & e[13]) / 2) > 4294967295 && (o -= 8589934592),
                    64 & r ? ((s = 536870912 * (14 & e[14]) + 4194304 * (255 & e[15]) + 16384 * (254 & e[16]) + 128 * (255 & e[17]) + (254 & e[18]) / 2) > 4294967295 && (s -= 8589934592),
                    o - s > 54e5 && (l.logger.warn(Math.round((o - s) / 9e4) + "s delta between PTS and DTS, align them"),
                    o = s)) : s = o),
                    u = (a = e[8]) + 9,
                    t.size -= u,
                    n = new Uint8Array(t.size);
                    for (var h = 0, p = c.length; h < p; h++) {
                        var g = (e = c[h]).byteLength;
                        if (u) {
                            if (u > g) {
                                u -= g;
                                continue
                            }
                            e = e.subarray(u),
                            g -= u,
                            u = 0
                        }
                        n.set(e, d),
                        d += g
                    }
                    return i && (i -= a + 3),
                    {
                        data: n,
                        pts: o,
                        dts: s,
                        len: i
                    }
                }
                return null
            }
            ,
            t.prototype.pushAccesUnit = function(t, e) {
                if (t.units.length && t.frame) {
                    var r = e.samples
                      , i = r.length;
                    !this.config.forceKeyFrameOnDiscontinuity || !0 === t.key || e.sps && (i || this.contiguous) ? (t.id = i,
                    r.push(t)) : e.dropped++
                }
                t.debug.length && l.logger.log(t.pts + "/" + t.dts + ":" + t.debug)
            }
            ,
            t.prototype._parseAVCPES = function(t, e) {
                var r, i, a, n = this, s = this._avcTrack, l = this._parseAVCNALu(t.data), u = this.avcSample, d = !1, c = this.pushAccesUnit.bind(this), f = function(t, e, r, i) {
                    return {
                        key: t,
                        pts: e,
                        dts: r,
                        units: [],
                        debug: i
                    }
                };
                t.data = null,
                u && l.length && !s.audFound && (c(u, s),
                u = this.avcSample = f(!1, t.pts, t.dts, "")),
                l.forEach(function(e) {
                    switch (e.type) {
                    case 1:
                        i = !0,
                        u || (u = n.avcSample = f(!0, t.pts, t.dts, "")),
                        u.frame = !0;
                        var l = e.data;
                        if (d && l.length > 4) {
                            var h = new o.default(l).readSliceType();
                            2 !== h && 4 !== h && 7 !== h && 9 !== h || (u.key = !0)
                        }
                        break;
                    case 5:
                        i = !0,
                        u || (u = n.avcSample = f(!0, t.pts, t.dts, "")),
                        u.key = !0,
                        u.frame = !0;
                        break;
                    case 6:
                        i = !0,
                        (r = new o.default(n.discardEPB(e.data))).readUByte();
                        for (var p = 0, g = 0, v = !1, y = 0; !v && r.bytesAvailable > 1; ) {
                            p = 0;
                            do {
                                p += y = r.readUByte()
                            } while (255 === y);g = 0;
                            do {
                                g += y = r.readUByte()
                            } while (255 === y);if (4 === p && 0 !== r.bytesAvailable) {
                                if (v = !0,
                                181 === r.readUByte())
                                    if (49 === r.readUShort())
                                        if (1195456820 === r.readUInt())
                                            if (3 === r.readUByte()) {
                                                var m = r.readUByte()
                                                  , _ = 31 & m
                                                  , E = [m, r.readUByte()];
                                                for (a = 0; a < _; a++)
                                                    E.push(r.readUByte()),
                                                    E.push(r.readUByte()),
                                                    E.push(r.readUByte());
                                                n._insertSampleInOrder(n._txtTrack.samples, {
                                                    type: 3,
                                                    pts: t.pts,
                                                    bytes: E
                                                })
                                            }
                            } else if (g < r.bytesAvailable)
                                for (a = 0; a < g; a++)
                                    r.readUByte()
                        }
                        break;
                    case 7:
                        if (i = !0,
                        d = !0,
                        !s.sps) {
                            var T = (r = new o.default(e.data)).readSPS();
                            s.width = T.width,
                            s.height = T.height,
                            s.pixelRatio = T.pixelRatio,
                            s.sps = [e.data],
                            s.duration = n._duration;
                            var S = e.data.subarray(1, 4)
                              , b = "avc1.";
                            for (a = 0; a < 3; a++) {
                                var A = S[a].toString(16);
                                A.length < 2 && (A = "0" + A),
                                b += A
                            }
                            s.codec = b
                        }
                        break;
                    case 8:
                        i = !0,
                        s.pps || (s.pps = [e.data]);
                        break;
                    case 9:
                        i = !1,
                        s.audFound = !0,
                        u && c(u, s),
                        u = n.avcSample = f(!1, t.pts, t.dts, "");
                        break;
                    case 12:
                        i = !1;
                        break;
                    default:
                        i = !1,
                        u && (u.debug += "unknown NAL " + e.type + " ")
                    }
                    u && i && u.units.push(e)
                }),
                e && u && (c(u, s),
                this.avcSample = null)
            }
            ,
            t.prototype._insertSampleInOrder = function(t, e) {
                var r = t.length;
                if (r > 0) {
                    if (e.pts >= t[r - 1].pts)
                        t.push(e);
                    else
                        for (var i = r - 1; i >= 0; i--)
                            if (e.pts < t[i].pts) {
                                t.splice(i, 0, e);
                                break
                            }
                } else
                    t.push(e)
            }
            ,
            t.prototype._getLastNalUnit = function() {
                var t, e = this.avcSample;
                if (!e || 0 === e.units.length) {
                    var r = this._avcTrack.samples;
                    e = r[r.length - 1]
                }
                if (e) {
                    var i = e.units;
                    t = i[i.length - 1]
                }
                return t
            }
            ,
            t.prototype._parseAVCNALu = function(t) {
                var e, r, i, a, n = 0, o = t.byteLength, s = this._avcTrack, l = s.naluState || 0, u = l, d = [], c = -1;
                for (-1 === l && (c = 0,
                a = 31 & t[0],
                l = 0,
                n = 1); n < o; )
                    if (e = t[n++],
                    l)
                        if (1 !== l)
                            if (e)
                                if (1 === e) {
                                    var f, h;
                                    if (c >= 0)
                                        i = {
                                            data: t.subarray(c, n - l - 1),
                                            type: a
                                        },
                                        d.push(i);
                                    else if (f = this._getLastNalUnit())
                                        if (u && n <= 4 - u && f.state && (f.data = f.data.subarray(0, f.data.byteLength - u)),
                                        (r = n - l - 1) > 0)
                                            (h = new Uint8Array(f.data.byteLength + r)).set(f.data, 0),
                                            h.set(t.subarray(0, r), f.data.byteLength),
                                            f.data = h;
                                    n < o ? (c = n,
                                    a = 31 & t[n],
                                    l = 0) : l = -1
                                } else
                                    l = 0;
                            else
                                l = 3;
                        else
                            l = e ? 0 : 2;
                    else
                        l = e ? 0 : 1;
                (c >= 0 && l >= 0 && (i = {
                    data: t.subarray(c, o),
                    type: a,
                    state: l
                },
                d.push(i)),
                0 === d.length) && ((f = this._getLastNalUnit()) && ((h = new Uint8Array(f.data.byteLength + t.byteLength)).set(f.data, 0),
                h.set(t, f.data.byteLength),
                f.data = h));
                return s.naluState = l,
                d
            }
            ,
            t.prototype.discardEPB = function(t) {
                for (var e, r, i = t.byteLength, a = [], n = 1; n < i - 2; )
                    0 === t[n] && 0 === t[n + 1] && 3 === t[n + 2] ? (a.push(n + 2),
                    n += 2) : n++;
                if (0 === a.length)
                    return t;
                e = i - a.length,
                r = new Uint8Array(e);
                var o = 0;
                for (n = 0; n < e; o++,
                n++)
                    o === a[0] && (o++,
                    a.shift()),
                    r[n] = t[o];
                return r
            }
            ,
            t.prototype._parseAACPES = function(t) {
                var e, r, a, o, s, d = this._audioTrack, c = t.data, f = t.pts, h = this.aacOverFlow, p = this.aacLastPTS;
                if (h) {
                    var g = new Uint8Array(h.byteLength + c.byteLength);
                    g.set(h, 0),
                    g.set(c, h.byteLength),
                    c = g
                }
                for (a = 0,
                s = c.length; a < s - 1 && !i.isHeader(c, a); a++)
                    ;
                if (a) {
                    var v = void 0
                      , y = void 0;
                    if (a < s - 1 ? (v = "AAC PES did not start with ADTS header,offset:" + a,
                    y = !1) : (v = "no ADTS header found in AAC PES",
                    y = !0),
                    l.logger.warn("parsing error:" + v),
                    this.observer.trigger(n.default.ERROR, {
                        type: u.ErrorTypes.MEDIA_ERROR,
                        details: u.ErrorDetails.FRAG_PARSING_ERROR,
                        fatal: y,
                        reason: v
                    }),
                    y)
                        return
                }
                if (i.initTrackConfig(d, this.observer, c, a, this.audioCodec),
                r = 0,
                e = i.getFrameDuration(d.samplerate),
                h && p) {
                    var m = p + e;
                    Math.abs(m - f) > 1 && (l.logger.log("AAC: align PTS for overlapping frames by " + Math.round((m - f) / 90)),
                    f = m)
                }
                for (; a < s; )
                    if (i.isHeader(c, a) && a + 5 < s) {
                        var _ = i.appendFrame(d, c, a, f, r);
                        if (!_)
                            break;
                        a += _.length,
                        o = _.sample.pts,
                        r++
                    } else
                        a++;
                h = a < s ? c.subarray(a, s) : null,
                this.aacOverFlow = h,
                this.aacLastPTS = o
            }
            ,
            t.prototype._parseMPEGPES = function(t) {
                for (var e = t.data, r = e.length, i = 0, n = 0, o = t.pts; n < r; )
                    if (a.default.isHeader(e, n)) {
                        var s = a.default.appendFrame(this._audioTrack, e, n, o, i);
                        if (!s)
                            break;
                        n += s.length,
                        i++
                    } else
                        n++
            }
            ,
            t.prototype._parseID3PES = function(t) {
                this._id3Track.samples.push(t)
            }
            ,
            t
        }();
        e.default = c
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(0)
          , a = function() {
            function t(t) {
                this.data = t,
                this.bytesAvailable = t.byteLength,
                this.word = 0,
                this.bitsAvailable = 0
            }
            return t.prototype.loadWord = function() {
                var t = this.data
                  , e = this.bytesAvailable
                  , r = t.byteLength - e
                  , i = new Uint8Array(4)
                  , a = Math.min(4, e);
                if (0 === a)
                    throw new Error("no bytes available");
                i.set(t.subarray(r, r + a)),
                this.word = new DataView(i.buffer).getUint32(0),
                this.bitsAvailable = 8 * a,
                this.bytesAvailable -= a
            }
            ,
            t.prototype.skipBits = function(t) {
                var e;
                this.bitsAvailable > t ? (this.word <<= t,
                this.bitsAvailable -= t) : (t -= this.bitsAvailable,
                t -= (e = t >> 3) >> 3,
                this.bytesAvailable -= e,
                this.loadWord(),
                this.word <<= t,
                this.bitsAvailable -= t)
            }
            ,
            t.prototype.readBits = function(t) {
                var e = Math.min(this.bitsAvailable, t)
                  , r = this.word >>> 32 - e;
                return t > 32 && i.logger.error("Cannot read more than 32 bits at a time"),
                this.bitsAvailable -= e,
                this.bitsAvailable > 0 ? this.word <<= e : this.bytesAvailable > 0 && this.loadWord(),
                (e = t - e) > 0 && this.bitsAvailable ? r << e | this.readBits(e) : r
            }
            ,
            t.prototype.skipLZ = function() {
                var t;
                for (t = 0; t < this.bitsAvailable; ++t)
                    if (0 != (this.word & 2147483648 >>> t))
                        return this.word <<= t,
                        this.bitsAvailable -= t,
                        t;
                return this.loadWord(),
                t + this.skipLZ()
            }
            ,
            t.prototype.skipUEG = function() {
                this.skipBits(1 + this.skipLZ())
            }
            ,
            t.prototype.skipEG = function() {
                this.skipBits(1 + this.skipLZ())
            }
            ,
            t.prototype.readUEG = function() {
                var t = this.skipLZ();
                return this.readBits(t + 1) - 1
            }
            ,
            t.prototype.readEG = function() {
                var t = this.readUEG();
                return 1 & t ? 1 + t >>> 1 : -1 * (t >>> 1)
            }
            ,
            t.prototype.readBoolean = function() {
                return 1 === this.readBits(1)
            }
            ,
            t.prototype.readUByte = function() {
                return this.readBits(8)
            }
            ,
            t.prototype.readUShort = function() {
                return this.readBits(16)
            }
            ,
            t.prototype.readUInt = function() {
                return this.readBits(32)
            }
            ,
            t.prototype.skipScalingList = function(t) {
                var e, r = 8, i = 8;
                for (e = 0; e < t; e++)
                    0 !== i && (i = (r + this.readEG() + 256) % 256),
                    r = 0 === i ? r : i
            }
            ,
            t.prototype.readSPS = function() {
                var t, e, r, i, a, n, o, s = 0, l = 0, u = 0, d = 0, c = this.readUByte.bind(this), f = this.readBits.bind(this), h = this.readUEG.bind(this), p = this.readBoolean.bind(this), g = this.skipBits.bind(this), v = this.skipEG.bind(this), y = this.skipUEG.bind(this), m = this.skipScalingList.bind(this);
                if (c(),
                t = c(),
                f(5),
                g(3),
                c(),
                y(),
                100 === t || 110 === t || 122 === t || 244 === t || 44 === t || 83 === t || 86 === t || 118 === t || 128 === t) {
                    var _ = h();
                    if (3 === _ && g(1),
                    y(),
                    y(),
                    g(1),
                    p())
                        for (n = 3 !== _ ? 8 : 12,
                        o = 0; o < n; o++)
                            p() && m(o < 6 ? 16 : 64)
                }
                y();
                var E = h();
                if (0 === E)
                    h();
                else if (1 === E)
                    for (g(1),
                    v(),
                    v(),
                    e = h(),
                    o = 0; o < e; o++)
                        v();
                y(),
                g(1),
                r = h(),
                i = h(),
                0 === (a = f(1)) && g(1),
                g(1),
                p() && (s = h(),
                l = h(),
                u = h(),
                d = h());
                var T = [1, 1];
                if (p() && p())
                    switch (c()) {
                    case 1:
                        T = [1, 1];
                        break;
                    case 2:
                        T = [12, 11];
                        break;
                    case 3:
                        T = [10, 11];
                        break;
                    case 4:
                        T = [16, 11];
                        break;
                    case 5:
                        T = [40, 33];
                        break;
                    case 6:
                        T = [24, 11];
                        break;
                    case 7:
                        T = [20, 11];
                        break;
                    case 8:
                        T = [32, 11];
                        break;
                    case 9:
                        T = [80, 33];
                        break;
                    case 10:
                        T = [18, 11];
                        break;
                    case 11:
                        T = [15, 11];
                        break;
                    case 12:
                        T = [64, 33];
                        break;
                    case 13:
                        T = [160, 99];
                        break;
                    case 14:
                        T = [4, 3];
                        break;
                    case 15:
                        T = [3, 2];
                        break;
                    case 16:
                        T = [2, 1];
                        break;
                    case 255:
                        T = [c() << 8 | c(), c() << 8 | c()]
                    }
                return {
                    width: Math.ceil(16 * (r + 1) - 2 * s - 2 * l),
                    height: (2 - a) * (i + 1) * 16 - (a ? 2 : 4) * (u + d),
                    pixelRatio: T
                }
            }
            ,
            t.prototype.readSliceType = function() {
                return this.readUByte(),
                this.readUEG(),
                this.readUEG()
            }
            ,
            t
        }();
        e.default = a
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(13)
          , a = function() {
            function t(t, e, r, a) {
                this.decryptdata = r,
                this.discardEPB = a,
                this.decrypter = new i.default(t,e,{
                    removePKCS7Padding: !1
                })
            }
            return t.prototype.decryptBuffer = function(t, e) {
                this.decrypter.decrypt(t, this.decryptdata.key.buffer, this.decryptdata.iv.buffer, e)
            }
            ,
            t.prototype.decryptAacSample = function(t, e, r, i) {
                var a = t[e].unit
                  , n = a.subarray(16, a.length - a.length % 16)
                  , o = n.buffer.slice(n.byteOffset, n.byteOffset + n.length)
                  , s = this;
                this.decryptBuffer(o, function(n) {
                    n = new Uint8Array(n),
                    a.set(n, 16),
                    i || s.decryptAacSamples(t, e + 1, r)
                })
            }
            ,
            t.prototype.decryptAacSamples = function(t, e, r) {
                for (; ; e++) {
                    if (e >= t.length)
                        return void r();
                    if (!(t[e].unit.length < 32)) {
                        var i = this.decrypter.isSync();
                        if (this.decryptAacSample(t, e, r, i),
                        !i)
                            return
                    }
                }
            }
            ,
            t.prototype.getAvcEncryptedData = function(t) {
                for (var e = 16 * Math.floor((t.length - 48) / 160) + 16, r = new Int8Array(e), i = 0, a = 32; a <= t.length - 16; a += 160,
                i += 16)
                    r.set(t.subarray(a, a + 16), i);
                return r
            }
            ,
            t.prototype.getAvcDecryptedUnit = function(t, e) {
                e = new Uint8Array(e);
                for (var r = 0, i = 32; i <= t.length - 16; i += 160,
                r += 16)
                    t.set(e.subarray(r, r + 16), i);
                return t
            }
            ,
            t.prototype.decryptAvcSample = function(t, e, r, i, a, n) {
                var o = this.discardEPB(a.data)
                  , s = this.getAvcEncryptedData(o)
                  , l = this;
                this.decryptBuffer(s.buffer, function(s) {
                    a.data = l.getAvcDecryptedUnit(o, s),
                    n || l.decryptAvcSamples(t, e, r + 1, i)
                })
            }
            ,
            t.prototype.decryptAvcSamples = function(t, e, r, i) {
                for (; ; e++,
                r = 0) {
                    if (e >= t.length)
                        return void i();
                    for (var a = t[e].units; !(r >= a.length); r++) {
                        var n = a[r];
                        if (!(n.length <= 48 || 1 !== n.type && 5 !== n.type)) {
                            var o = this.decrypter.isSync();
                            if (this.decryptAvcSample(t, e, r, i, n, o),
                            !o)
                                return
                        }
                    }
                }
            }
            ,
            t
        }();
        e.default = a
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(9)
          , a = r(0)
          , n = r(23)
          , o = function() {
            function t(t, e, r) {
                this.observer = t,
                this.config = r,
                this.remuxer = e
            }
            return t.prototype.resetInitSegment = function(t, e, r, i) {
                this._audioTrack = {
                    container: "audio/mpeg",
                    type: "audio",
                    id: -1,
                    sequenceNumber: 0,
                    isAAC: !1,
                    samples: [],
                    len: 0,
                    manifestCodec: e,
                    duration: i,
                    inputTimeScale: 9e4
                }
            }
            ,
            t.prototype.resetTimeStamp = function() {}
            ,
            t.probe = function(t) {
                var e, r, o = i.default.getID3Data(t, 0);
                if (o && void 0 !== i.default.getTimeStamp(o))
                    for (e = o.length,
                    r = Math.min(t.length - 1, e + 100); e < r; e++)
                        if (n.default.probe(t, e))
                            return a.logger.log("MPEG Audio sync word found !"),
                            !0;
                return !1
            }
            ,
            t.prototype.append = function(t, e, r, a) {
                for (var o = i.default.getID3Data(t, 0), s = i.default.getTimeStamp(o), l = s ? 90 * s : 9e4 * e, u = o.length, d = t.length, c = 0, f = 0, h = this._audioTrack, p = [{
                    pts: l,
                    dts: l,
                    data: o
                }]; u < d; )
                    if (n.default.isHeader(t, u)) {
                        var g = n.default.appendFrame(h, t, u, l, c);
                        if (!g)
                            break;
                        u += g.length,
                        f = g.sample.pts,
                        c++
                    } else
                        i.default.isHeader(t, u) ? (o = i.default.getID3Data(t, u),
                        p.push({
                            pts: f,
                            dts: f,
                            data: o
                        }),
                        u += o.length) : u++;
                this.remuxer.remux(h, {
                    samples: []
                }, {
                    samples: p,
                    inputTimeScale: 9e4
                }, {
                    samples: []
                }, e, r, a)
            }
            ,
            t.prototype.destroy = function() {}
            ,
            t
        }();
        e.default = o
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(45)
          , a = r(46)
          , n = r(1)
          , o = r(2)
          , s = r(0)
          , l = function() {
            function t(t, e, r, i) {
                this.observer = t,
                this.config = e,
                this.typeSupported = r;
                var a = navigator.userAgent;
                this.isSafari = i && i.indexOf("Apple") > -1 && a && !a.match("CriOS"),
                this.ISGenerated = !1
            }
            return t.prototype.destroy = function() {}
            ,
            t.prototype.resetTimeStamp = function(t) {
                this._initPTS = this._initDTS = t
            }
            ,
            t.prototype.resetInitSegment = function() {
                this.ISGenerated = !1
            }
            ,
            t.prototype.remux = function(t, e, r, i, a, o, l) {
                if (this.ISGenerated || this.generateIS(t, e, a),
                this.ISGenerated) {
                    var u = t.samples.length
                      , d = e.samples.length
                      , c = a
                      , f = a;
                    if (u && d) {
                        var h = (t.samples[0].dts - e.samples[0].dts) / e.inputTimeScale;
                        c += Math.max(0, h),
                        f += Math.max(0, -h)
                    }
                    if (u) {
                        t.timescale || (s.logger.warn("regenerate InitSegment as audio detected"),
                        this.generateIS(t, e, a));
                        var p = this.remuxAudio(t, c, o, l);
                        if (d) {
                            var g = void 0;
                            p && (g = p.endPTS - p.startPTS),
                            e.timescale || (s.logger.warn("regenerate InitSegment as video detected"),
                            this.generateIS(t, e, a)),
                            this.remuxVideo(e, f, o, g, l)
                        }
                    } else if (d) {
                        var v = this.remuxVideo(e, f, o, 0, l);
                        v && t.codec && this.remuxEmptyAudio(t, c, o, v)
                    }
                }
                r.samples.length && this.remuxID3(r, a),
                i.samples.length && this.remuxText(i, a),
                this.observer.trigger(n.default.FRAG_PARSED)
            }
            ,
            t.prototype.generateIS = function(t, e, r) {
                var i, l, u = this.observer, d = t.samples, c = e.samples, f = this.typeSupported, h = "audio/mp4", p = {}, g = {
                    tracks: p
                }, v = void 0 === this._initPTS;
                if (v && (i = l = 1 / 0),
                t.config && d.length && (t.timescale = t.samplerate,
                s.logger.log("audio sampling rate : " + t.samplerate),
                t.isAAC || (f.mpeg ? (h = "audio/mpeg",
                t.codec = "") : f.mp3 && (t.codec = "mp3")),
                p.audio = {
                    container: h,
                    codec: t.codec,
                    initSegment: !t.isAAC && f.mpeg ? new Uint8Array : a.default.initSegment([t]),
                    metadata: {
                        channelCount: t.channelCount
                    }
                },
                v && (i = l = d[0].pts - t.inputTimeScale * r)),
                e.sps && e.pps && c.length) {
                    var y = e.inputTimeScale;
                    e.timescale = y,
                    p.video = {
                        container: "video/mp4",
                        codec: e.codec,
                        initSegment: a.default.initSegment([e]),
                        metadata: {
                            width: e.width,
                            height: e.height
                        }
                    },
                    v && (i = Math.min(i, c[0].pts - y * r),
                    l = Math.min(l, c[0].dts - y * r),
                    this.observer.trigger(n.default.INIT_PTS_FOUND, {
                        initPTS: i
                    }))
                }
                Object.keys(p).length ? (u.trigger(n.default.FRAG_PARSING_INIT_SEGMENT, g),
                this.ISGenerated = !0,
                v && (this._initPTS = i,
                this._initDTS = l)) : u.trigger(n.default.ERROR, {
                    type: o.ErrorTypes.MEDIA_ERROR,
                    details: o.ErrorDetails.FRAG_PARSING_ERROR,
                    fatal: !1,
                    reason: "no audio/video samples found"
                })
            }
            ,
            t.prototype.remuxVideo = function(t, e, r, i, l) {
                var u, d, c, f, h, p, g, v = 8, y = t.timescale, m = t.samples, _ = [], E = m.length, T = this._PTSNormalize, S = this._initDTS, b = this.nextAvcDts, A = this.isSafari;
                if (0 !== E) {
                    A && (r |= m.length && b && (l && Math.abs(e - b / y) < .1 || Math.abs(m[0].pts - b - S) < y / 5)),
                    r || (b = e * y),
                    m.forEach(function(t) {
                        t.pts = T(t.pts - S, b),
                        t.dts = T(t.dts - S, b)
                    }),
                    m.sort(function(t, e) {
                        var r = t.dts - e.dts
                          , i = t.pts - e.pts;
                        return r || i || t.id - e.id
                    });
                    var R = m.reduce(function(t, e) {
                        return Math.max(Math.min(t, e.pts - e.dts), -18e3)
                    }, 0);
                    if (R < 0) {
                        s.logger.warn("PTS < DTS detected in video samples, shifting DTS by " + Math.round(R / 90) + " ms to overcome this issue");
                        for (var D = 0; D < m.length; D++)
                            m[D].dts += R
                    }
                    var L = m[0];
                    h = Math.max(L.dts, 0),
                    f = Math.max(L.pts, 0);
                    var w = Math.round((h - b) / 90);
                    r && w && (w > 1 ? s.logger.log("AVC:" + w + " ms hole between fragments detected,filling it") : w < -1 && s.logger.log("AVC:" + -w + " ms overlapping between fragments detected"),
                    h = b,
                    m[0].dts = h,
                    f = Math.max(f - w, b),
                    m[0].pts = f,
                    s.logger.log("Video/PTS/DTS adjusted: " + Math.round(f / 90) + "/" + Math.round(h / 90) + ",delta:" + w + " ms")),
                    h,
                    L = m[m.length - 1],
                    g = Math.max(L.dts, 0),
                    p = Math.max(L.pts, 0, g),
                    A && (u = Math.round((g - h) / (m.length - 1)));
                    var k = 0
                      , O = 0;
                    for (D = 0; D < E; D++) {
                        for (var I = m[D], P = I.units, C = P.length, x = 0, F = 0; F < C; F++)
                            x += P[F].data.length;
                        O += x,
                        k += C,
                        I.length = x,
                        I.dts = A ? h + D * u : Math.max(I.dts, h),
                        I.pts = Math.max(I.pts, I.dts)
                    }
                    var M = O + 4 * k + 8;
                    try {
                        d = new Uint8Array(M)
                    } catch (t) {
                        return void this.observer.trigger(n.default.ERROR, {
                            type: o.ErrorTypes.MUX_ERROR,
                            details: o.ErrorDetails.REMUX_ALLOC_ERROR,
                            fatal: !1,
                            bytes: M,
                            reason: "fail allocating video mdat " + M
                        })
                    }
                    var B = new DataView(d.buffer);
                    B.setUint32(0, M),
                    d.set(a.default.types.mdat, 4);
                    for (D = 0; D < E; D++) {
                        var N = m[D]
                          , U = N.units
                          , G = 0
                          , j = void 0;
                        for (F = 0,
                        C = U.length; F < C; F++) {
                            var H = U[F]
                              , K = H.data
                              , W = H.data.byteLength;
                            B.setUint32(v, W),
                            v += 4,
                            d.set(K, v),
                            v += W,
                            G += 4 + W
                        }
                        if (A)
                            j = Math.max(0, u * Math.round((N.pts - N.dts) / u));
                        else {
                            if (D < E - 1)
                                u = m[D + 1].dts - N.dts;
                            else {
                                var z = this.config
                                  , Y = N.dts - m[D > 0 ? D - 1 : D].dts;
                                if (z.stretchShortVideoTrack) {
                                    var V = z.maxBufferHole
                                      , q = Math.floor(V * y)
                                      , X = (i ? f + i * y : this.nextAudioPts) - N.pts;
                                    X > q ? ((u = X - Y) < 0 && (u = Y),
                                    s.logger.log("It is approximately " + X / 90 + " ms to the next segment; using duration " + u / 90 + " ms for the last video frame.")) : u = Y
                                } else
                                    u = Y
                            }
                            j = Math.round(N.pts - N.dts)
                        }
                        _.push({
                            size: G,
                            duration: u,
                            cts: j,
                            flags: {
                                isLeading: 0,
                                isDependedOn: 0,
                                hasRedundancy: 0,
                                degradPrio: 0,
                                dependsOn: N.key ? 2 : 1,
                                isNonSync: N.key ? 0 : 1
                            }
                        })
                    }
                    this.nextAvcDts = g + u;
                    var Q = t.dropped;
                    if (t.len = 0,
                    t.nbNalu = 0,
                    t.dropped = 0,
                    _.length && navigator.userAgent.toLowerCase().indexOf("chrome") > -1) {
                        var Z = _[0].flags;
                        Z.dependsOn = 2,
                        Z.isNonSync = 0
                    }
                    t.samples = _,
                    c = a.default.moof(t.sequenceNumber++, h, t),
                    t.samples = [];
                    var $ = {
                        data1: c,
                        data2: d,
                        startPTS: f / y,
                        endPTS: (p + u) / y,
                        startDTS: h / y,
                        endDTS: this.nextAvcDts / y,
                        type: "video",
                        hasAudio: !1,
                        hasVideo: !0,
                        nb: _.length,
                        dropped: Q
                    };
                    return this.observer.trigger(n.default.FRAG_PARSING_DATA, $),
                    $
                }
            }
            ,
            t.prototype.remuxAudio = function(t, e, r, l) {
                var u, d, c, f, h, p, g, v = t.inputTimeScale, y = t.timescale, m = v / y, _ = (t.isAAC ? 1024 : 1152) * m, E = this._PTSNormalize, T = this._initDTS, S = !t.isAAC && this.typeSupported.mpeg, b = t.samples, A = [], R = this.nextAudioPts;
                if (r |= b.length && R && (l && Math.abs(e - R / v) < .1 || Math.abs(b[0].pts - R - T) < 20 * _),
                b.forEach(function(t) {
                    t.pts = t.dts = E(t.pts - T, e * v)
                }),
                0 !== (b = b.filter(function(t) {
                    return t.pts >= 0
                })).length) {
                    if (r || (R = l ? e * v : b[0].pts),
                    t.isAAC)
                        for (var D = this.config.maxAudioFramesDrift, L = 0, w = R; L < b.length; ) {
                            var k, O = b[L];
                            k = (N = O.pts) - w;
                            var I = Math.abs(1e3 * k / v);
                            if (k <= -D * _)
                                s.logger.warn("Dropping 1 audio frame @ " + (w / v).toFixed(3) + "s due to " + Math.round(I) + " ms overlap."),
                                b.splice(L, 1),
                                t.len -= O.unit.length;
                            else if (k >= D * _ && I < 1e4 && w) {
                                var P = Math.round(k / _);
                                s.logger.warn("Injecting " + P + " audio frame @ " + (w / v).toFixed(3) + "s due to " + Math.round(1e3 * k / v) + " ms gap.");
                                for (var C = 0; C < P; C++) {
                                    var x = Math.max(w, 0);
                                    (c = i.default.getSilentFrame(t.manifestCodec || t.codec, t.channelCount)) || (s.logger.log("Unable to get silent frame for given audio codec; duplicating last frame instead."),
                                    c = O.unit.subarray()),
                                    b.splice(L, 0, {
                                        unit: c,
                                        pts: x,
                                        dts: x
                                    }),
                                    t.len += c.length,
                                    w += _,
                                    L++
                                }
                                O.pts = O.dts = w,
                                w += _,
                                L++
                            } else
                                Math.abs(k),
                                O.pts = O.dts = w,
                                w += _,
                                L++
                        }
                    C = 0;
                    for (var F = b.length; C < F; C++) {
                        var M = b[C]
                          , B = M.unit
                          , N = M.pts;
                        if (void 0 !== g)
                            d.duration = Math.round((N - g) / m);
                        else {
                            var U = Math.round(1e3 * (N - R) / v)
                              , G = 0;
                            if (r && t.isAAC && U) {
                                if (U > 0 && U < 1e4)
                                    G = Math.round((N - R) / _),
                                    s.logger.log(U + " ms hole between AAC samples detected,filling it"),
                                    G > 0 && ((c = i.default.getSilentFrame(t.manifestCodec || t.codec, t.channelCount)) || (c = B.subarray()),
                                    t.len += G * c.length);
                                else if (U < -12) {
                                    s.logger.log("drop overlapping AAC sample, expected/parsed/delta:" + (R / v).toFixed(3) + "s/" + (N / v).toFixed(3) + "s/" + -U + "ms"),
                                    t.len -= B.byteLength;
                                    continue
                                }
                                N = R
                            }
                            if (p = N,
                            !(t.len > 0))
                                return;
                            var j = S ? t.len : t.len + 8;
                            u = S ? 0 : 8;
                            try {
                                f = new Uint8Array(j)
                            } catch (t) {
                                return void this.observer.trigger(n.default.ERROR, {
                                    type: o.ErrorTypes.MUX_ERROR,
                                    details: o.ErrorDetails.REMUX_ALLOC_ERROR,
                                    fatal: !1,
                                    bytes: j,
                                    reason: "fail allocating audio mdat " + j
                                })
                            }
                            S || (new DataView(f.buffer).setUint32(0, j),
                            f.set(a.default.types.mdat, 4));
                            for (L = 0; L < G; L++)
                                (c = i.default.getSilentFrame(t.manifestCodec || t.codec, t.channelCount)) || (s.logger.log("Unable to get silent frame for given audio codec; duplicating this frame instead."),
                                c = B.subarray()),
                                f.set(c, u),
                                u += c.byteLength,
                                d = {
                                    size: c.byteLength,
                                    cts: 0,
                                    duration: 1024,
                                    flags: {
                                        isLeading: 0,
                                        isDependedOn: 0,
                                        hasRedundancy: 0,
                                        degradPrio: 0,
                                        dependsOn: 1
                                    }
                                },
                                A.push(d)
                        }
                        f.set(B, u);
                        var H = B.byteLength;
                        u += H,
                        d = {
                            size: H,
                            cts: 0,
                            duration: 0,
                            flags: {
                                isLeading: 0,
                                isDependedOn: 0,
                                hasRedundancy: 0,
                                degradPrio: 0,
                                dependsOn: 1
                            }
                        },
                        A.push(d),
                        g = N
                    }
                    var K = 0
                      , W = A.length;
                    if (W >= 2 && (K = A[W - 2].duration,
                    d.duration = K),
                    W) {
                        this.nextAudioPts = R = g + m * K,
                        t.len = 0,
                        t.samples = A,
                        h = S ? new Uint8Array : a.default.moof(t.sequenceNumber++, p / m, t),
                        t.samples = [];
                        var z = p / v
                          , Y = R / v
                          , V = {
                            data1: h,
                            data2: f,
                            startPTS: z,
                            endPTS: Y,
                            startDTS: z,
                            endDTS: Y,
                            type: "audio",
                            hasAudio: !0,
                            hasVideo: !1,
                            nb: W
                        };
                        return this.observer.trigger(n.default.FRAG_PARSING_DATA, V),
                        V
                    }
                    return null
                }
            }
            ,
            t.prototype.remuxEmptyAudio = function(t, e, r, a) {
                var n = t.inputTimeScale
                  , o = n / (t.samplerate ? t.samplerate : n)
                  , l = this.nextAudioPts
                  , u = (void 0 !== l ? l : a.startDTS * n) + this._initDTS
                  , d = a.endDTS * n + this._initDTS
                  , c = 1024 * o
                  , f = Math.ceil((d - u) / c)
                  , h = i.default.getSilentFrame(t.manifestCodec || t.codec, t.channelCount);
                if (s.logger.warn("remux empty Audio"),
                h) {
                    for (var p = [], g = 0; g < f; g++) {
                        var v = u + g * c;
                        p.push({
                            unit: h,
                            pts: v,
                            dts: v
                        }),
                        t.len += h.length
                    }
                    t.samples = p,
                    this.remuxAudio(t, e, r)
                } else
                    s.logger.trace("Unable to remuxEmptyAudio since we were unable to get a silent frame for given audio codec!")
            }
            ,
            t.prototype.remuxID3 = function(t, e) {
                var r, i = t.samples.length, a = t.inputTimeScale, o = this._initPTS, s = this._initDTS;
                if (i) {
                    for (var l = 0; l < i; l++)
                        (r = t.samples[l]).pts = (r.pts - o) / a,
                        r.dts = (r.dts - s) / a;
                    this.observer.trigger(n.default.FRAG_PARSING_METADATA, {
                        samples: t.samples
                    })
                }
                t.samples = [],
                e = e
            }
            ,
            t.prototype.remuxText = function(t, e) {
                t.samples.sort(function(t, e) {
                    return t.pts - e.pts
                });
                var r, i = t.samples.length, a = t.inputTimeScale, o = this._initPTS;
                if (i) {
                    for (var s = 0; s < i; s++)
                        (r = t.samples[s]).pts = (r.pts - o) / a;
                    this.observer.trigger(n.default.FRAG_PARSING_USERDATA, {
                        samples: t.samples
                    })
                }
                t.samples = [],
                e = e
            }
            ,
            t.prototype._PTSNormalize = function(t, e) {
                var r;
                if (void 0 === e)
                    return t;
                for (r = e < t ? -8589934592 : 8589934592; Math.abs(t - e) > 4294967296; )
                    t += r;
                return t
            }
            ,
            t
        }();
        e.default = l
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = function() {
            function t() {}
            return t.getSilentFrame = function(t, e) {
                switch (t) {
                case "mp4a.40.2":
                    if (1 === e)
                        return new Uint8Array([0, 200, 0, 128, 35, 128]);
                    if (2 === e)
                        return new Uint8Array([33, 0, 73, 144, 2, 25, 0, 35, 128]);
                    if (3 === e)
                        return new Uint8Array([0, 200, 0, 128, 32, 132, 1, 38, 64, 8, 100, 0, 142]);
                    if (4 === e)
                        return new Uint8Array([0, 200, 0, 128, 32, 132, 1, 38, 64, 8, 100, 0, 128, 44, 128, 8, 2, 56]);
                    if (5 === e)
                        return new Uint8Array([0, 200, 0, 128, 32, 132, 1, 38, 64, 8, 100, 0, 130, 48, 4, 153, 0, 33, 144, 2, 56]);
                    if (6 === e)
                        return new Uint8Array([0, 200, 0, 128, 32, 132, 1, 38, 64, 8, 100, 0, 130, 48, 4, 153, 0, 33, 144, 2, 0, 178, 0, 32, 8, 224]);
                    break;
                default:
                    if (1 === e)
                        return new Uint8Array([1, 64, 34, 128, 163, 78, 230, 128, 186, 8, 0, 0, 0, 28, 6, 241, 193, 10, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 94]);
                    if (2 === e)
                        return new Uint8Array([1, 64, 34, 128, 163, 94, 230, 128, 186, 8, 0, 0, 0, 0, 149, 0, 6, 241, 161, 10, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 94]);
                    if (3 === e)
                        return new Uint8Array([1, 64, 34, 128, 163, 94, 230, 128, 186, 8, 0, 0, 0, 0, 149, 0, 6, 241, 161, 10, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 94])
                }
                return null
            }
            ,
            t
        }();
        e.default = i
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = Math.pow(2, 32) - 1
          , a = function() {
            function t() {}
            return t.init = function() {
                var e;
                for (e in t.types = {
                    avc1: [],
                    avcC: [],
                    btrt: [],
                    dinf: [],
                    dref: [],
                    esds: [],
                    ftyp: [],
                    hdlr: [],
                    mdat: [],
                    mdhd: [],
                    mdia: [],
                    mfhd: [],
                    minf: [],
                    moof: [],
                    moov: [],
                    mp4a: [],
                    ".mp3": [],
                    mvex: [],
                    mvhd: [],
                    pasp: [],
                    sdtp: [],
                    stbl: [],
                    stco: [],
                    stsc: [],
                    stsd: [],
                    stsz: [],
                    stts: [],
                    tfdt: [],
                    tfhd: [],
                    traf: [],
                    trak: [],
                    trun: [],
                    trex: [],
                    tkhd: [],
                    vmhd: [],
                    smhd: []
                },
                t.types)
                    t.types.hasOwnProperty(e) && (t.types[e] = [e.charCodeAt(0), e.charCodeAt(1), e.charCodeAt(2), e.charCodeAt(3)]);
                var r = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 118, 105, 100, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 86, 105, 100, 101, 111, 72, 97, 110, 100, 108, 101, 114, 0])
                  , i = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 115, 111, 117, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 83, 111, 117, 110, 100, 72, 97, 110, 100, 108, 101, 114, 0]);
                t.HDLR_TYPES = {
                    video: r,
                    audio: i
                };
                var a = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 12, 117, 114, 108, 32, 0, 0, 0, 1])
                  , n = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
                t.STTS = t.STSC = t.STCO = n,
                t.STSZ = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                t.VMHD = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]),
                t.SMHD = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]),
                t.STSD = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1]);
                var o = new Uint8Array([105, 115, 111, 109])
                  , s = new Uint8Array([97, 118, 99, 49])
                  , l = new Uint8Array([0, 0, 0, 1]);
                t.FTYP = t.box(t.types.ftyp, o, l, o, s),
                t.DINF = t.box(t.types.dinf, t.box(t.types.dref, a))
            }
            ,
            t.box = function(t) {
                for (var e, r = Array.prototype.slice.call(arguments, 1), i = 8, a = r.length, n = a; a--; )
                    i += r[a].byteLength;
                for ((e = new Uint8Array(i))[0] = i >> 24 & 255,
                e[1] = i >> 16 & 255,
                e[2] = i >> 8 & 255,
                e[3] = 255 & i,
                e.set(t, 4),
                a = 0,
                i = 8; a < n; a++)
                    e.set(r[a], i),
                    i += r[a].byteLength;
                return e
            }
            ,
            t.hdlr = function(e) {
                return t.box(t.types.hdlr, t.HDLR_TYPES[e])
            }
            ,
            t.mdat = function(e) {
                return t.box(t.types.mdat, e)
            }
            ,
            t.mdhd = function(e, r) {
                r *= e;
                var a = Math.floor(r / (i + 1))
                  , n = Math.floor(r % (i + 1));
                return t.box(t.types.mdhd, new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 3, e >> 24 & 255, e >> 16 & 255, e >> 8 & 255, 255 & e, a >> 24, a >> 16 & 255, a >> 8 & 255, 255 & a, n >> 24, n >> 16 & 255, n >> 8 & 255, 255 & n, 85, 196, 0, 0]))
            }
            ,
            t.mdia = function(e) {
                return t.box(t.types.mdia, t.mdhd(e.timescale, e.duration), t.hdlr(e.type), t.minf(e))
            }
            ,
            t.mfhd = function(e) {
                return t.box(t.types.mfhd, new Uint8Array([0, 0, 0, 0, e >> 24, e >> 16 & 255, e >> 8 & 255, 255 & e]))
            }
            ,
            t.minf = function(e) {
                return "audio" === e.type ? t.box(t.types.minf, t.box(t.types.smhd, t.SMHD), t.DINF, t.stbl(e)) : t.box(t.types.minf, t.box(t.types.vmhd, t.VMHD), t.DINF, t.stbl(e))
            }
            ,
            t.moof = function(e, r, i) {
                return t.box(t.types.moof, t.mfhd(e), t.traf(i, r))
            }
            ,
            t.moov = function(e) {
                for (var r = e.length, i = []; r--; )
                    i[r] = t.trak(e[r]);
                return t.box.apply(null, [t.types.moov, t.mvhd(e[0].timescale, e[0].duration)].concat(i).concat(t.mvex(e)))
            }
            ,
            t.mvex = function(e) {
                for (var r = e.length, i = []; r--; )
                    i[r] = t.trex(e[r]);
                return t.box.apply(null, [t.types.mvex].concat(i))
            }
            ,
            t.mvhd = function(e, r) {
                r *= e;
                var a = Math.floor(r / (i + 1))
                  , n = Math.floor(r % (i + 1))
                  , o = new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 3, e >> 24 & 255, e >> 16 & 255, e >> 8 & 255, 255 & e, a >> 24, a >> 16 & 255, a >> 8 & 255, 255 & a, n >> 24, n >> 16 & 255, n >> 8 & 255, 255 & n, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255]);
                return t.box(t.types.mvhd, o)
            }
            ,
            t.sdtp = function(e) {
                var r, i, a = e.samples || [], n = new Uint8Array(4 + a.length);
                for (i = 0; i < a.length; i++)
                    r = a[i].flags,
                    n[i + 4] = r.dependsOn << 4 | r.isDependedOn << 2 | r.hasRedundancy;
                return t.box(t.types.sdtp, n)
            }
            ,
            t.stbl = function(e) {
                return t.box(t.types.stbl, t.stsd(e), t.box(t.types.stts, t.STTS), t.box(t.types.stsc, t.STSC), t.box(t.types.stsz, t.STSZ), t.box(t.types.stco, t.STCO))
            }
            ,
            t.avc1 = function(e) {
                var r, i, a, n = [], o = [];
                for (r = 0; r < e.sps.length; r++)
                    a = (i = e.sps[r]).byteLength,
                    n.push(a >>> 8 & 255),
                    n.push(255 & a),
                    n = n.concat(Array.prototype.slice.call(i));
                for (r = 0; r < e.pps.length; r++)
                    a = (i = e.pps[r]).byteLength,
                    o.push(a >>> 8 & 255),
                    o.push(255 & a),
                    o = o.concat(Array.prototype.slice.call(i));
                var s = t.box(t.types.avcC, new Uint8Array([1, n[3], n[4], n[5], 255, 224 | e.sps.length].concat(n).concat([e.pps.length]).concat(o)))
                  , l = e.width
                  , u = e.height
                  , d = e.pixelRatio[0]
                  , c = e.pixelRatio[1];
                return t.box(t.types.avc1, new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, l >> 8 & 255, 255 & l, u >> 8 & 255, 255 & u, 0, 72, 0, 0, 0, 72, 0, 0, 0, 0, 0, 0, 0, 1, 18, 100, 97, 105, 108, 121, 109, 111, 116, 105, 111, 110, 47, 104, 108, 115, 46, 106, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 24, 17, 17]), s, t.box(t.types.btrt, new Uint8Array([0, 28, 156, 128, 0, 45, 198, 192, 0, 45, 198, 192])), t.box(t.types.pasp, new Uint8Array([d >> 24, d >> 16 & 255, d >> 8 & 255, 255 & d, c >> 24, c >> 16 & 255, c >> 8 & 255, 255 & c])))
            }
            ,
            t.esds = function(t) {
                var e = t.config.length;
                return new Uint8Array([0, 0, 0, 0, 3, 23 + e, 0, 1, 0, 4, 15 + e, 64, 21, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5].concat([e]).concat(t.config).concat([6, 1, 2]))
            }
            ,
            t.mp4a = function(e) {
                var r = e.samplerate;
                return t.box(t.types.mp4a, new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, e.channelCount, 0, 16, 0, 0, 0, 0, r >> 8 & 255, 255 & r, 0, 0]), t.box(t.types.esds, t.esds(e)))
            }
            ,
            t.mp3 = function(e) {
                var r = e.samplerate;
                return t.box(t.types[".mp3"], new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, e.channelCount, 0, 16, 0, 0, 0, 0, r >> 8 & 255, 255 & r, 0, 0]))
            }
            ,
            t.stsd = function(e) {
                return "audio" === e.type ? e.isAAC || "mp3" !== e.codec ? t.box(t.types.stsd, t.STSD, t.mp4a(e)) : t.box(t.types.stsd, t.STSD, t.mp3(e)) : t.box(t.types.stsd, t.STSD, t.avc1(e))
            }
            ,
            t.tkhd = function(e) {
                var r = e.id
                  , a = e.duration * e.timescale
                  , n = e.width
                  , o = e.height
                  , s = Math.floor(a / (i + 1))
                  , l = Math.floor(a % (i + 1));
                return t.box(t.types.tkhd, new Uint8Array([1, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 3, r >> 24 & 255, r >> 16 & 255, r >> 8 & 255, 255 & r, 0, 0, 0, 0, s >> 24, s >> 16 & 255, s >> 8 & 255, 255 & s, l >> 24, l >> 16 & 255, l >> 8 & 255, 255 & l, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 64, 0, 0, 0, n >> 8 & 255, 255 & n, 0, 0, o >> 8 & 255, 255 & o, 0, 0]))
            }
            ,
            t.traf = function(e, r) {
                var a = t.sdtp(e)
                  , n = e.id
                  , o = Math.floor(r / (i + 1))
                  , s = Math.floor(r % (i + 1));
                return t.box(t.types.traf, t.box(t.types.tfhd, new Uint8Array([0, 0, 0, 0, n >> 24, n >> 16 & 255, n >> 8 & 255, 255 & n])), t.box(t.types.tfdt, new Uint8Array([1, 0, 0, 0, o >> 24, o >> 16 & 255, o >> 8 & 255, 255 & o, s >> 24, s >> 16 & 255, s >> 8 & 255, 255 & s])), t.trun(e, a.length + 16 + 20 + 8 + 16 + 8 + 8), a)
            }
            ,
            t.trak = function(e) {
                return e.duration = e.duration || 4294967295,
                t.box(t.types.trak, t.tkhd(e), t.mdia(e))
            }
            ,
            t.trex = function(e) {
                var r = e.id;
                return t.box(t.types.trex, new Uint8Array([0, 0, 0, 0, r >> 24, r >> 16 & 255, r >> 8 & 255, 255 & r, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1]))
            }
            ,
            t.trun = function(e, r) {
                var i, a, n, o, s, l, u = e.samples || [], d = u.length, c = 12 + 16 * d, f = new Uint8Array(c);
                for (r += 8 + c,
                f.set([0, 0, 15, 1, d >>> 24 & 255, d >>> 16 & 255, d >>> 8 & 255, 255 & d, r >>> 24 & 255, r >>> 16 & 255, r >>> 8 & 255, 255 & r], 0),
                i = 0; i < d; i++)
                    n = (a = u[i]).duration,
                    o = a.size,
                    s = a.flags,
                    l = a.cts,
                    f.set([n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, 255 & n, o >>> 24 & 255, o >>> 16 & 255, o >>> 8 & 255, 255 & o, s.isLeading << 2 | s.dependsOn, s.isDependedOn << 6 | s.hasRedundancy << 4 | s.paddingValue << 1 | s.isNonSync, 61440 & s.degradPrio, 15 & s.degradPrio, l >>> 24 & 255, l >>> 16 & 255, l >>> 8 & 255, 255 & l], 12 + 16 * i);
                return t.box(t.types.trun, f)
            }
            ,
            t.initSegment = function(e) {
                t.types || t.init();
                var r, i = t.moov(e);
                return (r = new Uint8Array(t.FTYP.byteLength + i.byteLength)).set(t.FTYP),
                r.set(i, t.FTYP.byteLength),
                r
            }
            ,
            t
        }();
        e.default = a
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(1)
          , a = function() {
            function t(t) {
                this.observer = t
            }
            return t.prototype.destroy = function() {}
            ,
            t.prototype.resetTimeStamp = function() {}
            ,
            t.prototype.resetInitSegment = function() {}
            ,
            t.prototype.remux = function(t, e, r, a, n, o, s, l) {
                var u = this.observer
                  , d = "";
                t && (d += "audio"),
                e && (d += "video"),
                u.trigger(i.default.FRAG_PARSING_DATA, {
                    data1: l,
                    startPTS: n,
                    startDTS: n,
                    type: d,
                    hasAudio: !!t,
                    hasVideo: !!e,
                    nb: 1,
                    dropped: 0
                }),
                u.trigger(i.default.FRAG_PARSED)
            }
            ,
            t
        }();
        e.default = a
    }
    , function(t, e, r) {
        "use strict";
        var i = Object.prototype.hasOwnProperty
          , a = "~";
        function n() {}
        function o(t, e, r, i, n) {
            if ("function" != typeof r)
                throw new TypeError("The listener must be a function");
            var o = new function(t, e, r) {
                this.fn = t,
                this.context = e,
                this.once = r || !1
            }
            (r,i || t,n)
              , s = a ? a + e : e;
            return t._events[s] ? t._events[s].fn ? t._events[s] = [t._events[s], o] : t._events[s].push(o) : (t._events[s] = o,
            t._eventsCount++),
            t
        }
        function s(t, e) {
            0 == --t._eventsCount ? t._events = new n : delete t._events[e]
        }
        function l() {
            this._events = new n,
            this._eventsCount = 0
        }
        Object.create && (n.prototype = Object.create(null),
        (new n).__proto__ || (a = !1)),
        l.prototype.eventNames = function() {
            var t, e, r = [];
            if (0 === this._eventsCount)
                return r;
            for (e in t = this._events)
                i.call(t, e) && r.push(a ? e.slice(1) : e);
            return Object.getOwnPropertySymbols ? r.concat(Object.getOwnPropertySymbols(t)) : r
        }
        ,
        l.prototype.listeners = function(t) {
            var e = a ? a + t : t
              , r = this._events[e];
            if (!r)
                return [];
            if (r.fn)
                return [r.fn];
            for (var i = 0, n = r.length, o = new Array(n); i < n; i++)
                o[i] = r[i].fn;
            return o
        }
        ,
        l.prototype.listenerCount = function(t) {
            var e = a ? a + t : t
              , r = this._events[e];
            return r ? r.fn ? 1 : r.length : 0
        }
        ,
        l.prototype.emit = function(t, e, r, i, n, o) {
            var s = a ? a + t : t;
            if (!this._events[s])
                return !1;
            var l, u, d = this._events[s], c = arguments.length;
            if (d.fn) {
                switch (d.once && this.removeListener(t, d.fn, void 0, !0),
                c) {
                case 1:
                    return d.fn.call(d.context),
                    !0;
                case 2:
                    return d.fn.call(d.context, e),
                    !0;
                case 3:
                    return d.fn.call(d.context, e, r),
                    !0;
                case 4:
                    return d.fn.call(d.context, e, r, i),
                    !0;
                case 5:
                    return d.fn.call(d.context, e, r, i, n),
                    !0;
                case 6:
                    return d.fn.call(d.context, e, r, i, n, o),
                    !0
                }
                for (u = 1,
                l = new Array(c - 1); u < c; u++)
                    l[u - 1] = arguments[u];
                d.fn.apply(d.context, l)
            } else {
                var f, h = d.length;
                for (u = 0; u < h; u++)
                    switch (d[u].once && this.removeListener(t, d[u].fn, void 0, !0),
                    c) {
                    case 1:
                        d[u].fn.call(d[u].context);
                        break;
                    case 2:
                        d[u].fn.call(d[u].context, e);
                        break;
                    case 3:
                        d[u].fn.call(d[u].context, e, r);
                        break;
                    case 4:
                        d[u].fn.call(d[u].context, e, r, i);
                        break;
                    default:
                        if (!l)
                            for (f = 1,
                            l = new Array(c - 1); f < c; f++)
                                l[f - 1] = arguments[f];
                        d[u].fn.apply(d[u].context, l)
                    }
            }
            return !0
        }
        ,
        l.prototype.on = function(t, e, r) {
            return o(this, t, e, r, !1)
        }
        ,
        l.prototype.once = function(t, e, r) {
            return o(this, t, e, r, !0)
        }
        ,
        l.prototype.removeListener = function(t, e, r, i) {
            var n = a ? a + t : t;
            if (!this._events[n])
                return this;
            if (!e)
                return s(this, n),
                this;
            var o = this._events[n];
            if (o.fn)
                o.fn !== e || i && !o.once || r && o.context !== r || s(this, n);
            else {
                for (var l = 0, u = [], d = o.length; l < d; l++)
                    (o[l].fn !== e || i && !o[l].once || r && o[l].context !== r) && u.push(o[l]);
                u.length ? this._events[n] = 1 === u.length ? u[0] : u : s(this, n)
            }
            return this
        }
        ,
        l.prototype.removeAllListeners = function(t) {
            var e;
            return t ? (e = a ? a + t : t,
            this._events[e] && s(this, e)) : (this._events = new n,
            this._eventsCount = 0),
            this
        }
        ,
        l.prototype.off = l.prototype.removeListener,
        l.prototype.addListener = l.prototype.on,
        l.prefixed = a,
        l.EventEmitter = l,
        t.exports = l
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(21)
          , a = r(1)
          , n = r(0)
          , o = r(50);
        e.default = function(t) {
            var e = new o.EventEmitter;
            e.trigger = function(t) {
                for (var r = [], i = 1; i < arguments.length; i++)
                    r[i - 1] = arguments[i];
                e.emit.apply(e, [t, t].concat(r))
            }
            ,
            e.off = function(t) {
                for (var r = [], i = 1; i < arguments.length; i++)
                    r[i - 1] = arguments[i];
                e.removeListener.apply(e, [t].concat(r))
            }
            ;
            var r = function(e, r) {
                t.postMessage({
                    event: e,
                    data: r
                })
            };
            t.addEventListener("message", function(a) {
                var o = a.data;
                switch (o.cmd) {
                case "init":
                    var s = JSON.parse(o.config);
                    t.demuxer = new i.default(e,o.typeSupported,s,o.vendor),
                    n.enableLogs(s.debug),
                    r("init", null);
                    break;
                case "demux":
                    t.demuxer.push(o.data, o.decryptdata, o.initSegment, o.audioCodec, o.videoCodec, o.timeOffset, o.discontinuity, o.trackSwitch, o.contiguous, o.duration, o.accurateTimeOffset, o.defaultInitPTS, o.url)
                }
            }),
            e.on(a.default.FRAG_DECRYPTED, r),
            e.on(a.default.FRAG_PARSING_INIT_SEGMENT, r),
            e.on(a.default.FRAG_PARSED, r),
            e.on(a.default.ERROR, r),
            e.on(a.default.FRAG_PARSING_METADATA, r),
            e.on(a.default.FRAG_PARSING_USERDATA, r),
            e.on(a.default.INIT_PTS_FOUND, r),
            e.on(a.default.FRAG_PARSING_DATA, function(e, r) {
                var i = []
                  , a = {
                    event: e,
                    data: r
                };
                r.data1 && (a.data1 = r.data1.buffer,
                i.push(r.data1.buffer),
                delete r.data1),
                r.data2 && (a.data2 = r.data2.buffer,
                i.push(r.data2.buffer),
                delete r.data2),
                t.postMessage(a, i)
            })
        }
    }
    , function(t, e) {
        function r() {
            this._events = this._events || {},
            this._maxListeners = this._maxListeners || void 0
        }
        function i(t) {
            return "function" == typeof t
        }
        function a(t) {
            return "object" == typeof t && null !== t
        }
        function n(t) {
            return void 0 === t
        }
        t.exports = r,
        r.EventEmitter = r,
        r.prototype._events = void 0,
        r.prototype._maxListeners = void 0,
        r.defaultMaxListeners = 10,
        r.prototype.setMaxListeners = function(t) {
            if (!function(t) {
                return "number" == typeof t
            }(t) || t < 0 || isNaN(t))
                throw TypeError("n must be a positive number");
            return this._maxListeners = t,
            this
        }
        ,
        r.prototype.emit = function(t) {
            var e, r, o, s, l, u;
            if (this._events || (this._events = {}),
            "error" === t && (!this._events.error || a(this._events.error) && !this._events.error.length)) {
                if ((e = arguments[1])instanceof Error)
                    throw e;
                var d = new Error('Uncaught, unspecified "error" event. (' + e + ")");
                throw d.context = e,
                d
            }
            if (n(r = this._events[t]))
                return !1;
            if (i(r))
                switch (arguments.length) {
                case 1:
                    r.call(this);
                    break;
                case 2:
                    r.call(this, arguments[1]);
                    break;
                case 3:
                    r.call(this, arguments[1], arguments[2]);
                    break;
                default:
                    s = Array.prototype.slice.call(arguments, 1),
                    r.apply(this, s)
                }
            else if (a(r))
                for (s = Array.prototype.slice.call(arguments, 1),
                o = (u = r.slice()).length,
                l = 0; l < o; l++)
                    u[l].apply(this, s);
            return !0
        }
        ,
        r.prototype.addListener = function(t, e) {
            var o;
            if (!i(e))
                throw TypeError("listener must be a function");
            return this._events || (this._events = {}),
            this._events.newListener && this.emit("newListener", t, i(e.listener) ? e.listener : e),
            this._events[t] ? a(this._events[t]) ? this._events[t].push(e) : this._events[t] = [this._events[t], e] : this._events[t] = e,
            a(this._events[t]) && !this._events[t].warned && (o = n(this._maxListeners) ? r.defaultMaxListeners : this._maxListeners) && o > 0 && this._events[t].length > o && (this._events[t].warned = !0,
            console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.", this._events[t].length),
            "function" == typeof console.trace && console.trace()),
            this
        }
        ,
        r.prototype.on = r.prototype.addListener,
        r.prototype.once = function(t, e) {
            if (!i(e))
                throw TypeError("listener must be a function");
            var r = !1;
            function a() {
                this.removeListener(t, a),
                r || (r = !0,
                e.apply(this, arguments))
            }
            return a.listener = e,
            this.on(t, a),
            this
        }
        ,
        r.prototype.removeListener = function(t, e) {
            var r, n, o, s;
            if (!i(e))
                throw TypeError("listener must be a function");
            if (!this._events || !this._events[t])
                return this;
            if (o = (r = this._events[t]).length,
            n = -1,
            r === e || i(r.listener) && r.listener === e)
                delete this._events[t],
                this._events.removeListener && this.emit("removeListener", t, e);
            else if (a(r)) {
                for (s = o; s-- > 0; )
                    if (r[s] === e || r[s].listener && r[s].listener === e) {
                        n = s;
                        break
                    }
                if (n < 0)
                    return this;
                1 === r.length ? (r.length = 0,
                delete this._events[t]) : r.splice(n, 1),
                this._events.removeListener && this.emit("removeListener", t, e)
            }
            return this
        }
        ,
        r.prototype.removeAllListeners = function(t) {
            var e, r;
            if (!this._events)
                return this;
            if (!this._events.removeListener)
                return 0 === arguments.length ? this._events = {} : this._events[t] && delete this._events[t],
                this;
            if (0 === arguments.length) {
                for (e in this._events)
                    "removeListener" !== e && this.removeAllListeners(e);
                return this.removeAllListeners("removeListener"),
                this._events = {},
                this
            }
            if (i(r = this._events[t]))
                this.removeListener(t, r);
            else if (r)
                for (; r.length; )
                    this.removeListener(t, r[r.length - 1]);
            return delete this._events[t],
            this
        }
        ,
        r.prototype.listeners = function(t) {
            return this._events && this._events[t] ? i(this._events[t]) ? [this._events[t]] : this._events[t].slice() : []
        }
        ,
        r.prototype.listenerCount = function(t) {
            if (this._events) {
                var e = this._events[t];
                if (i(e))
                    return 1;
                if (e)
                    return e.length
            }
            return 0
        }
        ,
        r.listenerCount = function(t, e) {
            return t.listenerCount(e)
        }
    }
    , function(t, e, r) {
        "use strict";
        (function(t) {
            Object.defineProperty(e, "__esModule", {
                value: !0
            });
            var i = r(7);
            function a(t, e, r) {
                void 0 === t && (t = 0),
                void 0 === e && (e = 0);
                var i = Math.min(e, r.duration + (r.deltaPTS ? r.deltaPTS : 0));
                return r.start + r.duration - i <= t ? 1 : r.start - i > t && r.start ? -1 : 0
            }
            function n(t, e, r) {
                var i = 1e3 * Math.min(e, r.duration + (r.deltaPTS ? r.deltaPTS : 0));
                return r.endProgramDateTime - i > t
            }
            e.findFragmentByPDT = function(e, r, i) {
                if (!Array.isArray(e) || !e.length || !t.isFinite(r))
                    return null;
                if (r < e[0].programDateTime)
                    return null;
                if (r >= e[e.length - 1].endProgramDateTime)
                    return null;
                i = i || 0;
                for (var a = 0; a < e.length; ++a) {
                    var o = e[a];
                    if (n(r, i, o))
                        return o
                }
                return null
            }
            ,
            e.findFragmentByPTS = function(t, e, r, n) {
                void 0 === r && (r = 0),
                void 0 === n && (n = 0);
                var o = t ? e[t.sn - e[0].sn + 1] : null;
                return o && !a(r, n, o) ? o : i.default.search(e, a.bind(null, r, n))
            }
            ,
            e.fragmentWithinToleranceTest = a,
            e.pdtWithinToleranceTest = n
        }
        ).call(this, r(3).Number)
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(8)
          , a = r(2)
          , n = r(1)
          , o = r(0)
          , s = function() {
            function t(t, e, r, i) {
                this.config = t,
                this.media = e,
                this.fragmentTracker = r,
                this.hls = i,
                this.stallReported = !1
            }
            return t.prototype.poll = function(t, e) {
                var r = this.config
                  , a = this.media
                  , n = a.currentTime
                  , s = window.performance.now();
                if (n !== t)
                    return this.stallReported && (o.logger.warn("playback not stuck anymore @" + n + ", after " + Math.round(s - this.stalled) + "ms"),
                    this.stallReported = !1),
                    this.stalled = null,
                    void (this.nudgeRetry = 0);
                if (!(a.ended || !a.buffered.length || a.readyState > 2 || a.seeking && i.BufferHelper.isBuffered(a, n))) {
                    var l = s - this.stalled
                      , u = i.BufferHelper.bufferInfo(a, n, r.maxBufferHole);
                    this.stalled ? (l >= 1e3 && this._reportStall(u.len),
                    this._tryFixBufferStall(u, l)) : this.stalled = s
                }
            }
            ,
            t.prototype._tryFixBufferStall = function(t, e) {
                var r = this.config
                  , i = this.fragmentTracker
                  , a = this.media.currentTime
                  , n = i.getPartialFragment(a);
                n && this._trySkipBufferHole(n),
                t.len > .5 && e > 1e3 * r.highBufferWatchdogPeriod && (this.stalled = null,
                this._tryNudgeBuffer())
            }
            ,
            t.prototype._reportStall = function(t) {
                var e = this.hls
                  , r = this.media;
                this.stallReported || (this.stallReported = !0,
                o.logger.warn("Playback stalling at @" + r.currentTime + " due to low buffer"),
                e.trigger(n.default.ERROR, {
                    type: a.ErrorTypes.MEDIA_ERROR,
                    details: a.ErrorDetails.BUFFER_STALLED_ERROR,
                    fatal: !1,
                    buffer: t
                }))
            }
            ,
            t.prototype._trySkipBufferHole = function(t) {
                for (var e = this.hls, r = this.media, i = r.currentTime, s = 0, l = 0; l < r.buffered.length; l++) {
                    var u = r.buffered.start(l);
                    if (i >= s && i < u)
                        return r.currentTime = Math.max(u, r.currentTime + .1),
                        o.logger.warn("skipping hole, adjusting currentTime from " + i + " to " + r.currentTime),
                        this.stalled = null,
                        void e.trigger(n.default.ERROR, {
                            type: a.ErrorTypes.MEDIA_ERROR,
                            details: a.ErrorDetails.BUFFER_SEEK_OVER_HOLE,
                            fatal: !1,
                            reason: "fragment loaded with buffer holes, seeking from " + i + " to " + r.currentTime,
                            frag: t
                        });
                    s = r.buffered.end(l)
                }
            }
            ,
            t.prototype._tryNudgeBuffer = function() {
                var t = this.config
                  , e = this.hls
                  , r = this.media
                  , i = r.currentTime
                  , s = (this.nudgeRetry || 0) + 1;
                if (this.nudgeRetry = s,
                s < t.nudgeMaxRetry) {
                    var l = i + s * t.nudgeOffset;
                    o.logger.log("adjust currentTime from " + i + " to " + l),
                    r.currentTime = l,
                    e.trigger(n.default.ERROR, {
                        type: a.ErrorTypes.MEDIA_ERROR,
                        details: a.ErrorDetails.BUFFER_NUDGE_ON_STALL,
                        fatal: !1
                    })
                } else
                    o.logger.error("still stuck in high buffer @" + i + " after " + t.nudgeMaxRetry + ", raise fatal error"),
                    e.trigger(n.default.ERROR, {
                        type: a.ErrorTypes.MEDIA_ERROR,
                        details: a.ErrorDetails.BUFFER_STALLED_ERROR,
                        fatal: !0
                    })
            }
            ,
            t
        }();
        e.default = s
    }
    , function(t, e, r) {
        "use strict";
        var i = this && this.__extends || function() {
            var t = Object.setPrototypeOf || {
                __proto__: []
            }instanceof Array && function(t, e) {
                t.__proto__ = e
            }
            || function(t, e) {
                for (var r in e)
                    e.hasOwnProperty(r) && (t[r] = e[r])
            }
            ;
            return function(e, r) {
                function i() {
                    this.constructor = e
                }
                t(e, r),
                e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                new i)
            }
        }();
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var a = r(1)
          , n = r(4)
          , o = r(0)
          , s = r(2)
          , l = r(19)
          , u = r(15)
          , d = window.performance
          , c = function(t) {
            function e(e) {
                var r = t.call(this, e, a.default.MANIFEST_LOADED, a.default.LEVEL_LOADED, a.default.AUDIO_TRACK_SWITCHED, a.default.FRAG_LOADED, a.default.ERROR) || this;
                return r.canload = !1,
                r.currentLevelIndex = null,
                r.manualLevelIndex = -1,
                r.timer = null,
                r
            }
            return i(e, t),
            e.prototype.onHandlerDestroying = function() {
                this.clearTimer(),
                this.manualLevelIndex = -1
            }
            ,
            e.prototype.clearTimer = function() {
                null !== this.timer && (clearTimeout(this.timer),
                this.timer = null)
            }
            ,
            e.prototype.startLoad = function() {
                var t = this._levels;
                this.canload = !0,
                this.levelRetryCount = 0,
                t && t.forEach(function(t) {
                    t.loadError = 0;
                    var e = t.details;
                    e && e.live && (t.details = void 0)
                }),
                null !== this.timer && this.loadLevel()
            }
            ,
            e.prototype.stopLoad = function() {
                this.canload = !1
            }
            ,
            e.prototype.onManifestLoaded = function(t) {
                var e, r = [], i = {}, n = null, d = !1, c = !1, f = /chrome|firefox/.test(navigator.userAgent.toLowerCase()), h = [];
                if (t.levels.forEach(function(t) {
                    t.loadError = 0,
                    t.fragmentError = !1,
                    d = d || !!t.videoCodec,
                    c = c || !!t.audioCodec || !(!t.attrs || !t.attrs.AUDIO),
                    f && t.audioCodec && -1 !== t.audioCodec.indexOf("mp4a.40.34") && (t.audioCodec = void 0),
                    (n = i[t.bitrate]) ? n.url.push(t.url) : (t.url = [t.url],
                    t.urlId = 0,
                    i[t.bitrate] = t,
                    r.push(t)),
                    t.attrs && t.attrs.AUDIO && u.addGroupId(n || t, "audio", t.attrs.AUDIO),
                    t.attrs && t.attrs.SUBTITLES && u.addGroupId(n || t, "text", t.attrs.SUBTITLES)
                }),
                d && c && (r = r.filter(function(t) {
                    return !!t.videoCodec
                })),
                r = r.filter(function(t) {
                    var e = t.audioCodec
                      , r = t.videoCodec;
                    return (!e || l.isCodecSupportedInMp4(e)) && (!r || l.isCodecSupportedInMp4(r))
                }),
                t.audioTracks && (h = t.audioTracks.filter(function(t) {
                    return !t.audioCodec || l.isCodecSupportedInMp4(t.audioCodec, "audio")
                })).forEach(function(t, e) {
                    t.id = e
                }),
                r.length > 0) {
                    e = r[0].bitrate,
                    r.sort(function(t, e) {
                        return t.bitrate - e.bitrate
                    }),
                    this._levels = r;
                    for (var p = 0; p < r.length; p++)
                        if (r[p].bitrate === e) {
                            this._firstLevel = p,
                            o.logger.log("manifest loaded," + r.length + " level(s) found, first bitrate:" + e);
                            break
                        }
                    this.hls.trigger(a.default.MANIFEST_PARSED, {
                        levels: r,
                        audioTracks: h,
                        firstLevel: this._firstLevel,
                        stats: t.stats,
                        audio: c,
                        video: d,
                        altAudio: h.length > 0 && d
                    })
                } else
                    this.hls.trigger(a.default.ERROR, {
                        type: s.ErrorTypes.MEDIA_ERROR,
                        details: s.ErrorDetails.MANIFEST_INCOMPATIBLE_CODECS_ERROR,
                        fatal: !0,
                        url: this.hls.url,
                        reason: "no level with compatible codecs found in manifest"
                    })
            }
            ,
            Object.defineProperty(e.prototype, "levels", {
                get: function() {
                    return this._levels
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "level", {
                get: function() {
                    return this.currentLevelIndex
                },
                set: function(t) {
                    var e = this._levels;
                    e && (t = Math.min(t, e.length - 1),
                    this.currentLevelIndex === t && e[t].details || this.setLevelInternal(t))
                },
                enumerable: !0,
                configurable: !0
            }),
            e.prototype.setLevelInternal = function(t) {
                var e = this._levels
                  , r = this.hls;
                if (t >= 0 && t < e.length) {
                    if (this.clearTimer(),
                    this.currentLevelIndex !== t) {
                        o.logger.log("switching to level " + t),
                        this.currentLevelIndex = t;
                        var i = e[t];
                        i.level = t,
                        r.trigger(a.default.LEVEL_SWITCHING, i)
                    }
                    var n = e[t]
                      , l = n.details;
                    if (!l || l.live) {
                        var u = n.urlId;
                        r.trigger(a.default.LEVEL_LOADING, {
                            url: n.url[u],
                            level: t,
                            id: u
                        })
                    }
                } else
                    r.trigger(a.default.ERROR, {
                        type: s.ErrorTypes.OTHER_ERROR,
                        details: s.ErrorDetails.LEVEL_SWITCH_ERROR,
                        level: t,
                        fatal: !1,
                        reason: "invalid level idx"
                    })
            }
            ,
            Object.defineProperty(e.prototype, "manualLevel", {
                get: function() {
                    return this.manualLevelIndex
                },
                set: function(t) {
                    this.manualLevelIndex = t,
                    void 0 === this._startLevel && (this._startLevel = t),
                    -1 !== t && (this.level = t)
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "firstLevel", {
                get: function() {
                    return this._firstLevel
                },
                set: function(t) {
                    this._firstLevel = t
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "startLevel", {
                get: function() {
                    if (void 0 === this._startLevel) {
                        var t = this.hls.config.startLevel;
                        return void 0 !== t ? t : this._firstLevel
                    }
                    return this._startLevel
                },
                set: function(t) {
                    this._startLevel = t
                },
                enumerable: !0,
                configurable: !0
            }),
            e.prototype.onError = function(t) {
                if (t.fatal)
                    t.type === s.ErrorTypes.NETWORK_ERROR && this.clearTimer();
                else {
                    var e, r = !1, i = !1;
                    switch (t.details) {
                    case s.ErrorDetails.FRAG_LOAD_ERROR:
                    case s.ErrorDetails.FRAG_LOAD_TIMEOUT:
                    case s.ErrorDetails.KEY_LOAD_ERROR:
                    case s.ErrorDetails.KEY_LOAD_TIMEOUT:
                        e = t.frag.level,
                        i = !0;
                        break;
                    case s.ErrorDetails.LEVEL_LOAD_ERROR:
                    case s.ErrorDetails.LEVEL_LOAD_TIMEOUT:
                        e = t.context.level,
                        r = !0;
                        break;
                    case s.ErrorDetails.REMUX_ALLOC_ERROR:
                        e = t.level,
                        r = !0
                    }
                    void 0 !== e && this.recoverLevel(t, e, r, i)
                }
            }
            ,
            e.prototype.recoverLevel = function(t, e, r, i) {
                var a, n, s, l = this, u = this.hls.config, d = t.details, c = this._levels[e];
                if (c.loadError++,
                c.fragmentError = i,
                r) {
                    if (!(this.levelRetryCount + 1 <= u.levelLoadingMaxRetry))
                        return o.logger.error("level controller, cannot recover from " + d + " error"),
                        this.currentLevelIndex = null,
                        this.clearTimer(),
                        void (t.fatal = !0);
                    n = Math.min(Math.pow(2, this.levelRetryCount) * u.levelLoadingRetryDelay, u.levelLoadingMaxRetryTimeout),
                    this.timer = setTimeout(function() {
                        return l.loadLevel()
                    }, n),
                    t.levelRetry = !0,
                    this.levelRetryCount++,
                    o.logger.warn("level controller, " + d + ", retry in " + n + " ms, current retry count is " + this.levelRetryCount)
                }
                (r || i) && ((a = c.url.length) > 1 && c.loadError < a ? (c.urlId = (c.urlId + 1) % a,
                c.details = void 0,
                o.logger.warn("level controller, " + d + " for level " + e + ": switching to redundant URL-id " + c.urlId)) : -1 === this.manualLevelIndex ? (s = 0 === e ? this._levels.length - 1 : e - 1,
                o.logger.warn("level controller, " + d + ": switch to " + s),
                this.hls.nextAutoLevel = this.currentLevelIndex = s) : i && (o.logger.warn("level controller, " + d + ": reload a fragment"),
                this.currentLevelIndex = null))
            }
            ,
            e.prototype.onFragLoaded = function(t) {
                var e = t.frag;
                if (void 0 !== e && "main" === e.type) {
                    var r = this._levels[e.level];
                    void 0 !== r && (r.fragmentError = !1,
                    r.loadError = 0,
                    this.levelRetryCount = 0)
                }
            }
            ,
            e.prototype.onLevelLoaded = function(t) {
                var e = this
                  , r = t.level;
                if (r === this.currentLevelIndex) {
                    var i = this._levels[r];
                    i.fragmentError || (i.loadError = 0,
                    this.levelRetryCount = 0);
                    var a = t.details;
                    if (a.live) {
                        var n = 1e3 * (a.averagetargetduration ? a.averagetargetduration : a.targetduration)
                          , s = n
                          , l = i.details;
                        l && a.endSN === l.endSN && (s /= 2,
                        o.logger.log("same live playlist, reload twice faster")),
                        s -= d.now() - t.stats.trequest,
                        s = Math.max(n / 2, Math.round(s)),
                        o.logger.log("live playlist, reload in " + Math.round(s) + " ms"),
                        this.timer = setTimeout(function() {
                            return e.loadLevel()
                        }, s)
                    } else
                        this.clearTimer()
                }
            }
            ,
            e.prototype.onAudioTrackSwitched = function(t) {
                var e = this.hls.audioTracks[t.id].groupId
                  , r = this.hls.levels[this.currentLevelIndex];
                if (r && r.audioGroupIds) {
                    var i = r.audioGroupIds.findIndex(function(t) {
                        return t === e
                    });
                    i !== r.urlId && (r.urlId = i,
                    this.startLoad())
                }
            }
            ,
            e.prototype.loadLevel = function() {
                if (o.logger.debug("call to loadLevel"),
                null !== this.currentLevelIndex && this.canload) {
                    var t = this._levels[this.currentLevelIndex];
                    if ("object" == typeof t && t.url.length > 0) {
                        var e = this.currentLevelIndex
                          , r = t.urlId
                          , i = t.url[r];
                        o.logger.log("Attempt loading level index " + e + " with URL-id " + r),
                        this.hls.trigger(a.default.LEVEL_LOADING, {
                            url: i,
                            level: e,
                            id: r
                        })
                    }
                }
            }
            ,
            Object.defineProperty(e.prototype, "nextLoadLevel", {
                get: function() {
                    return -1 !== this.manualLevelIndex ? this.manualLevelIndex : this.hls.nextAutoLevel
                },
                set: function(t) {
                    this.level = t,
                    -1 === this.manualLevelIndex && (this.hls.nextAutoLevel = t)
                },
                enumerable: !0,
                configurable: !0
            }),
            e
        }(n.default);
        e.default = c
    }
    , function(t, e, r) {
        "use strict";
        var i = this && this.__extends || function() {
            var t = Object.setPrototypeOf || {
                __proto__: []
            }instanceof Array && function(t, e) {
                t.__proto__ = e
            }
            || function(t, e) {
                for (var r in e)
                    e.hasOwnProperty(r) && (t[r] = e[r])
            }
            ;
            return function(e, r) {
                function i() {
                    this.constructor = e
                }
                t(e, r),
                e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                new i)
            }
        }();
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var a = r(1)
          , n = r(4)
          , o = r(9)
          , s = r(27)
          , l = function(t) {
            function e(e) {
                var r = t.call(this, e, a.default.MEDIA_ATTACHED, a.default.MEDIA_DETACHING, a.default.FRAG_PARSING_METADATA) || this;
                return r.id3Track = void 0,
                r.media = void 0,
                r
            }
            return i(e, t),
            e.prototype.destroy = function() {
                n.default.prototype.destroy.call(this)
            }
            ,
            e.prototype.onMediaAttached = function(t) {
                this.media = t.media,
                this.media
            }
            ,
            e.prototype.onMediaDetaching = function() {
                s.clearCurrentCues(this.id3Track),
                this.id3Track = void 0,
                this.media = void 0
            }
            ,
            e.prototype.getID3Track = function(t) {
                for (var e = 0; e < t.length; e++) {
                    var r = t[e];
                    if ("metadata" === r.kind && "id3" === r.label)
                        return s.sendAddTrackEvent(r, this.media),
                        r
                }
                return this.media.addTextTrack("metadata", "id3")
            }
            ,
            e.prototype.onFragParsingMetadata = function(t) {
                var e = t.frag
                  , r = t.samples;
                this.id3Track || (this.id3Track = this.getID3Track(this.media.textTracks),
                this.id3Track.mode = "hidden");
                for (var i = window.WebKitDataCue || window.VTTCue || window.TextTrackCue, a = 0; a < r.length; a++) {
                    var n = o.default.getID3Frames(r[a].data);
                    if (n) {
                        var s = r[a].pts
                          , l = a < r.length - 1 ? r[a + 1].pts : e.endPTS;
                        s === l && (l += 1e-4);
                        for (var u = 0; u < n.length; u++) {
                            var d = n[u];
                            if (!o.default.isTimeStampFrame(d)) {
                                var c = new i(s,l,"");
                                c.value = d,
                                this.id3Track.addCue(c)
                            }
                        }
                    }
                }
            }
            ,
            e
        }(n.default);
        e.default = l
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(14);
        e.isSupported = function() {
            var t = i.getMediaSource()
              , e = window.SourceBuffer || window.WebKitSourceBuffer
              , r = t && "function" == typeof t.isTypeSupported && t.isTypeSupported('video/mp4; codecs="avc1.42E01E,mp4a.40.2"')
              , a = !e || e.prototype && "function" == typeof e.prototype.appendBuffer && "function" == typeof e.prototype.remove;
            return !!r && !!a
        }
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(57)
          , a = r(60)
          , n = r(61)
          , o = r(62)
          , s = r(63)
          , l = r(64)
          , u = r(65)
          , d = r(66)
          , c = r(68)
          , f = r(72)
          , h = r(73)
          , p = r(74)
          , g = r(75);
        e.hlsDefaultConfig = {
            autoStartLoad: !0,
            startPosition: -1,
            defaultAudioCodec: void 0,
            debug: !1,
            capLevelOnFPSDrop: !1,
            capLevelToPlayerSize: !1,
            initialLiveManifestSize: 1,
            maxBufferLength: 30,
            maxBufferSize: 6e7,
            maxBufferHole: .5,
            lowBufferWatchdogPeriod: .5,
            highBufferWatchdogPeriod: 3,
            nudgeOffset: .1,
            nudgeMaxRetry: 3,
            maxFragLookUpTolerance: .25,
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 1 / 0,
            liveSyncDuration: void 0,
            liveMaxLatencyDuration: void 0,
            liveDurationInfinity: !1,
            liveBackBufferLength: 1 / 0,
            maxMaxBufferLength: 600,
            enableWorker: !0,
            enableSoftwareAES: !0,
            manifestLoadingTimeOut: 1e4,
            manifestLoadingMaxRetry: 1,
            manifestLoadingRetryDelay: 1e3,
            manifestLoadingMaxRetryTimeout: 64e3,
            startLevel: void 0,
            levelLoadingTimeOut: 1e4,
            levelLoadingMaxRetry: 4,
            levelLoadingRetryDelay: 1e3,
            levelLoadingMaxRetryTimeout: 64e3,
            fragLoadingTimeOut: 2e4,
            fragLoadingMaxRetry: 6,
            fragLoadingRetryDelay: 1e3,
            fragLoadingMaxRetryTimeout: 64e3,
            startFragPrefetch: !1,
            fpsDroppedMonitoringPeriod: 5e3,
            fpsDroppedMonitoringThreshold: .2,
            appendErrorMaxRetry: 3,
            loader: s.default,
            fLoader: void 0,
            pLoader: void 0,
            xhrSetup: void 0,
            licenseXhrSetup: void 0,
            abrController: i.default,
            bufferController: a.default,
            capLevelController: n.default,
            fpsController: o.default,
            stretchShortVideoTrack: !1,
            maxAudioFramesDrift: 1,
            forceKeyFrameOnDiscontinuity: !0,
            abrEwmaFastLive: 3,
            abrEwmaSlowLive: 9,
            abrEwmaFastVoD: 3,
            abrEwmaSlowVoD: 9,
            abrEwmaDefaultEstimate: 5e5,
            abrBandWidthFactor: .95,
            abrBandWidthUpFactor: .7,
            abrMaxWithRealBitrate: !1,
            maxStarvationDelay: 4,
            maxLoadingDelay: 4,
            minAutoBitrate: 0,
            emeEnabled: !1,
            widevineLicenseUrl: void 0,
            requestMediaKeySystemAccessFunc: g.requestMediaKeySystemAccess
        },
        e.hlsDefaultConfig.subtitleStreamController = h.default,
        e.hlsDefaultConfig.subtitleTrackController = f.default,
        e.hlsDefaultConfig.timelineController = c.default,
        e.hlsDefaultConfig.cueHandler = d,
        e.hlsDefaultConfig.enableCEA708Captions = !0,
        e.hlsDefaultConfig.enableWebVTT = !0,
        e.hlsDefaultConfig.captionsTextTrack1Label = "English",
        e.hlsDefaultConfig.captionsTextTrack1LanguageCode = "en",
        e.hlsDefaultConfig.captionsTextTrack2Label = "Spanish",
        e.hlsDefaultConfig.captionsTextTrack2LanguageCode = "es",
        e.hlsDefaultConfig.audioStreamController = u.default,
        e.hlsDefaultConfig.audioTrackController = l.default,
        e.hlsDefaultConfig.emeController = p.default
    }
    , function(t, e, r) {
        "use strict";
        (function(t) {
            var i = this && this.__extends || function() {
                var t = Object.setPrototypeOf || {
                    __proto__: []
                }instanceof Array && function(t, e) {
                    t.__proto__ = e
                }
                || function(t, e) {
                    for (var r in e)
                        e.hasOwnProperty(r) && (t[r] = e[r])
                }
                ;
                return function(e, r) {
                    function i() {
                        this.constructor = e
                    }
                    t(e, r),
                    e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                    new i)
                }
            }();
            Object.defineProperty(e, "__esModule", {
                value: !0
            });
            var a = r(1)
              , n = r(4)
              , o = r(8)
              , s = r(2)
              , l = r(0)
              , u = r(58)
              , d = window.performance
              , c = function(e) {
                function r(t) {
                    var r = e.call(this, t, a.default.FRAG_LOADING, a.default.FRAG_LOADED, a.default.FRAG_BUFFERED, a.default.ERROR) || this;
                    return r.lastLoadedFragLevel = 0,
                    r._nextAutoLevel = -1,
                    r.hls = t,
                    r.timer = null,
                    r._bwEstimator = null,
                    r.onCheck = r._abandonRulesCheck.bind(r),
                    r
                }
                return i(r, e),
                r.prototype.destroy = function() {
                    this.clearTimer(),
                    n.default.prototype.destroy.call(this)
                }
                ,
                r.prototype.onFragLoading = function(t) {
                    var e = t.frag;
                    if ("main" === e.type && (this.timer || (this.fragCurrent = e,
                    this.timer = setInterval(this.onCheck, 100)),
                    !this._bwEstimator)) {
                        var r = this.hls
                          , i = r.config
                          , a = e.level
                          , n = void 0
                          , o = void 0;
                        r.levels[a].details.live ? (n = i.abrEwmaFastLive,
                        o = i.abrEwmaSlowLive) : (n = i.abrEwmaFastVoD,
                        o = i.abrEwmaSlowVoD),
                        this._bwEstimator = new u.default(r,o,n,i.abrEwmaDefaultEstimate)
                    }
                }
                ,
                r.prototype._abandonRulesCheck = function() {
                    var t = this.hls
                      , e = t.media
                      , r = this.fragCurrent;
                    if (r) {
                        var i = r.loader
                          , n = t.minAutoLevel;
                        if (!i || i.stats && i.stats.aborted)
                            return l.logger.warn("frag loader destroy or aborted, disarm abandonRules"),
                            this.clearTimer(),
                            void (this._nextAutoLevel = -1);
                        var s = i.stats;
                        if (e && s && (!e.paused && 0 !== e.playbackRate || !e.readyState) && r.autoLevel && r.level) {
                            var u = d.now() - s.trequest
                              , c = Math.abs(e.playbackRate);
                            if (u > 500 * r.duration / c) {
                                var f = t.levels
                                  , h = Math.max(1, s.bw ? s.bw / 8 : 1e3 * s.loaded / u)
                                  , p = f[r.level]
                                  , g = p.realBitrate ? Math.max(p.realBitrate, p.bitrate) : p.bitrate
                                  , v = s.total ? s.total : Math.max(s.loaded, Math.round(r.duration * g / 8))
                                  , y = e.currentTime
                                  , m = (v - s.loaded) / h
                                  , _ = (o.BufferHelper.bufferInfo(e, y, t.config.maxBufferHole).end - y) / c;
                                if (_ < 2 * r.duration / c && m > _) {
                                    var E = void 0
                                      , T = void 0;
                                    for (T = r.level - 1; T > n; T--) {
                                        var S = f[T].realBitrate ? Math.max(f[T].realBitrate, f[T].bitrate) : f[T].bitrate;
                                        if ((E = r.duration * S / (6.4 * h)) < _)
                                            break
                                    }
                                    E < m && (l.logger.warn("loading too slow, abort fragment loading and switch to level " + T + ":fragLoadedDelay[" + T + "]<fragLoadedDelay[" + (r.level - 1) + "];bufferStarvationDelay:" + E.toFixed(1) + "<" + m.toFixed(1) + ":" + _.toFixed(1)),
                                    t.nextLoadLevel = T,
                                    this._bwEstimator.sample(u, s.loaded),
                                    i.abort(),
                                    this.clearTimer(),
                                    t.trigger(a.default.FRAG_LOAD_EMERGENCY_ABORTED, {
                                        frag: r,
                                        stats: s
                                    }))
                                }
                            }
                        }
                    }
                }
                ,
                r.prototype.onFragLoaded = function(e) {
                    var r = e.frag;
                    if ("main" === r.type && t.isFinite(r.sn)) {
                        if (this.clearTimer(),
                        this.lastLoadedFragLevel = r.level,
                        this._nextAutoLevel = -1,
                        this.hls.config.abrMaxWithRealBitrate) {
                            var i = this.hls.levels[r.level]
                              , a = (i.loaded ? i.loaded.bytes : 0) + e.stats.loaded
                              , n = (i.loaded ? i.loaded.duration : 0) + e.frag.duration;
                            i.loaded = {
                                bytes: a,
                                duration: n
                            },
                            i.realBitrate = Math.round(8 * a / n)
                        }
                        if (e.frag.bitrateTest) {
                            var o = e.stats;
                            o.tparsed = o.tbuffered = o.tload,
                            this.onFragBuffered(e)
                        }
                    }
                }
                ,
                r.prototype.onFragBuffered = function(e) {
                    var r = e.stats
                      , i = e.frag;
                    if (!0 !== r.aborted && "main" === i.type && t.isFinite(i.sn) && (!i.bitrateTest || r.tload === r.tbuffered)) {
                        var a = r.tparsed - r.trequest;
                        l.logger.log("latency/loading/parsing/append/kbps:" + Math.round(r.tfirst - r.trequest) + "/" + Math.round(r.tload - r.tfirst) + "/" + Math.round(r.tparsed - r.tload) + "/" + Math.round(r.tbuffered - r.tparsed) + "/" + Math.round(8 * r.loaded / (r.tbuffered - r.trequest))),
                        this._bwEstimator.sample(a, r.loaded),
                        r.bwEstimate = this._bwEstimator.getEstimate(),
                        i.bitrateTest ? this.bitrateTestDelay = a / 1e3 : this.bitrateTestDelay = 0
                    }
                }
                ,
                r.prototype.onError = function(t) {
                    switch (t.details) {
                    case s.ErrorDetails.FRAG_LOAD_ERROR:
                    case s.ErrorDetails.FRAG_LOAD_TIMEOUT:
                        this.clearTimer()
                    }
                }
                ,
                r.prototype.clearTimer = function() {
                    clearInterval(this.timer),
                    this.timer = null
                }
                ,
                Object.defineProperty(r.prototype, "nextAutoLevel", {
                    get: function() {
                        var t = this._nextAutoLevel
                          , e = this._bwEstimator;
                        if (!(-1 === t || e && e.canEstimate()))
                            return t;
                        var r = this._nextABRAutoLevel;
                        return -1 !== t && (r = Math.min(t, r)),
                        r
                    },
                    set: function(t) {
                        this._nextAutoLevel = t
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                Object.defineProperty(r.prototype, "_nextABRAutoLevel", {
                    get: function() {
                        var t = this.hls
                          , e = t.maxAutoLevel
                          , r = t.levels
                          , i = t.config
                          , a = t.minAutoLevel
                          , n = t.media
                          , s = this.lastLoadedFragLevel
                          , u = this.fragCurrent ? this.fragCurrent.duration : 0
                          , d = n ? n.currentTime : 0
                          , c = n && 0 !== n.playbackRate ? Math.abs(n.playbackRate) : 1
                          , f = this._bwEstimator ? this._bwEstimator.getEstimate() : i.abrEwmaDefaultEstimate
                          , h = (o.BufferHelper.bufferInfo(n, d, i.maxBufferHole).end - d) / c
                          , p = this._findBestLevel(s, u, f, a, e, h, i.abrBandWidthFactor, i.abrBandWidthUpFactor, r);
                        if (p >= 0)
                            return p;
                        l.logger.trace("rebuffering expected to happen, lets try to find a quality level minimizing the rebuffering");
                        var g = u ? Math.min(u, i.maxStarvationDelay) : i.maxStarvationDelay
                          , v = i.abrBandWidthFactor
                          , y = i.abrBandWidthUpFactor;
                        if (0 === h) {
                            var m = this.bitrateTestDelay;
                            if (m)
                                g = (u ? Math.min(u, i.maxLoadingDelay) : i.maxLoadingDelay) - m,
                                l.logger.trace("bitrate test took " + Math.round(1e3 * m) + "ms, set first fragment max fetchDuration to " + Math.round(1e3 * g) + " ms"),
                                v = y = 1
                        }
                        return p = this._findBestLevel(s, u, f, a, e, h + g, v, y, r),
                        Math.max(p, 0)
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                r.prototype._findBestLevel = function(t, e, r, i, a, n, o, s, u) {
                    for (var d = a; d >= i; d--) {
                        var c = u[d];
                        if (c) {
                            var f = c.details
                              , h = f ? f.totalduration / f.fragments.length : e
                              , p = !!f && f.live
                              , g = void 0;
                            g = d <= t ? o * r : s * r;
                            var v = u[d].realBitrate ? Math.max(u[d].realBitrate, u[d].bitrate) : u[d].bitrate
                              , y = v * h / g;
                            if (l.logger.trace("level/adjustedbw/bitrate/avgDuration/maxFetchDuration/fetchDuration: " + d + "/" + Math.round(g) + "/" + v + "/" + h + "/" + n + "/" + y),
                            g > v && (!y || p && !this.bitrateTestDelay || y < n))
                                return d
                        }
                    }
                    return -1
                }
                ,
                r
            }(n.default);
            e.default = c
        }
        ).call(this, r(3).Number)
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(59)
          , a = function() {
            function t(t, e, r, a) {
                this.hls = t,
                this.defaultEstimate_ = a,
                this.minWeight_ = .001,
                this.minDelayMs_ = 50,
                this.slow_ = new i.default(e),
                this.fast_ = new i.default(r)
            }
            return t.prototype.sample = function(t, e) {
                var r = 8e3 * e / (t = Math.max(t, this.minDelayMs_))
                  , i = t / 1e3;
                this.fast_.sample(i, r),
                this.slow_.sample(i, r)
            }
            ,
            t.prototype.canEstimate = function() {
                var t = this.fast_;
                return t && t.getTotalWeight() >= this.minWeight_
            }
            ,
            t.prototype.getEstimate = function() {
                return this.canEstimate() ? Math.min(this.fast_.getEstimate(), this.slow_.getEstimate()) : this.defaultEstimate_
            }
            ,
            t.prototype.destroy = function() {}
            ,
            t
        }();
        e.default = a
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = function() {
            function t(t) {
                this.alpha_ = t ? Math.exp(Math.log(.5) / t) : 0,
                this.estimate_ = 0,
                this.totalWeight_ = 0
            }
            return t.prototype.sample = function(t, e) {
                var r = Math.pow(this.alpha_, t);
                this.estimate_ = e * (1 - r) + r * this.estimate_,
                this.totalWeight_ += t
            }
            ,
            t.prototype.getTotalWeight = function() {
                return this.totalWeight_
            }
            ,
            t.prototype.getEstimate = function() {
                if (this.alpha_) {
                    var t = 1 - Math.pow(this.alpha_, this.totalWeight_);
                    return this.estimate_ / t
                }
                return this.estimate_
            }
            ,
            t
        }();
        e.default = i
    }
    , function(t, e, r) {
        "use strict";
        (function(t) {
            var i = this && this.__extends || function() {
                var t = Object.setPrototypeOf || {
                    __proto__: []
                }instanceof Array && function(t, e) {
                    t.__proto__ = e
                }
                || function(t, e) {
                    for (var r in e)
                        e.hasOwnProperty(r) && (t[r] = e[r])
                }
                ;
                return function(e, r) {
                    function i() {
                        this.constructor = e
                    }
                    t(e, r),
                    e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                    new i)
                }
            }();
            Object.defineProperty(e, "__esModule", {
                value: !0
            });
            var a = r(1)
              , n = r(4)
              , o = r(0)
              , s = r(2)
              , l = r(14).getMediaSource()
              , u = function(e) {
                function r(t) {
                    var r = e.call(this, t, a.default.MEDIA_ATTACHING, a.default.MEDIA_DETACHING, a.default.MANIFEST_PARSED, a.default.BUFFER_RESET, a.default.BUFFER_APPENDING, a.default.BUFFER_CODECS, a.default.BUFFER_EOS, a.default.BUFFER_FLUSHING, a.default.LEVEL_PTS_UPDATED, a.default.LEVEL_UPDATED) || this;
                    return r._msDuration = null,
                    r._levelDuration = null,
                    r._levelTargetDuration = 10,
                    r._live = null,
                    r._objectUrl = null,
                    r.onsbue = r.onSBUpdateEnd.bind(r),
                    r.onsbe = r.onSBUpdateError.bind(r),
                    r.pendingTracks = {},
                    r.tracks = {},
                    r
                }
                return i(r, e),
                r.prototype.destroy = function() {
                    n.default.prototype.destroy.call(this)
                }
                ,
                r.prototype.onLevelPtsUpdated = function(t) {
                    var e = t.type
                      , r = this.tracks.audio;
                    if ("audio" === e && r && "audio/mpeg" === r.container) {
                        var i = this.sourceBuffer.audio;
                        if (Math.abs(i.timestampOffset - t.start) > .1) {
                            var a = i.updating;
                            try {
                                i.abort()
                            } catch (t) {
                                o.logger.warn("can not abort audio buffer: " + t)
                            }
                            a ? this.audioTimestampOffset = t.start : (o.logger.warn("change mpeg audio timestamp offset from " + i.timestampOffset + " to " + t.start),
                            i.timestampOffset = t.start)
                        }
                    }
                }
                ,
                r.prototype.onManifestParsed = function(t) {
                    var e = t.audio
                      , r = t.video || t.levels.length && t.altAudio
                      , i = 0;
                    t.altAudio && (e || r) && (i = (e ? 1 : 0) + (r ? 1 : 0),
                    o.logger.log(i + " sourceBuffer(s) expected")),
                    this.sourceBufferNb = i
                }
                ,
                r.prototype.onMediaAttaching = function(t) {
                    var e = this.media = t.media;
                    if (e) {
                        var r = this.mediaSource = new l;
                        this.onmso = this.onMediaSourceOpen.bind(this),
                        this.onmse = this.onMediaSourceEnded.bind(this),
                        this.onmsc = this.onMediaSourceClose.bind(this),
                        r.addEventListener("sourceopen", this.onmso),
                        r.addEventListener("sourceended", this.onmse),
                        r.addEventListener("sourceclose", this.onmsc),
                        e.src = window.URL.createObjectURL(r),
                        this._objectUrl = e.src
                    }
                }
                ,
                r.prototype.onMediaDetaching = function() {
                    o.logger.log("media source detaching");
                    var t = this.mediaSource;
                    if (t) {
                        if ("open" === t.readyState)
                            try {
                                t.endOfStream()
                            } catch (t) {
                                o.logger.warn("onMediaDetaching:" + t.message + " while calling endOfStream")
                            }
                        t.removeEventListener("sourceopen", this.onmso),
                        t.removeEventListener("sourceended", this.onmse),
                        t.removeEventListener("sourceclose", this.onmsc),
                        this.media && (window.URL.revokeObjectURL(this._objectUrl),
                        this.media.src === this._objectUrl ? this.media.removeAttribute("src") : o.logger.warn("media.src was changed by a third party - skip cleanup")),
                        this.mediaSource = null,
                        this.media = null,
                        this._objectUrl = null,
                        this.pendingTracks = {},
                        this.tracks = {},
                        this.sourceBuffer = {},
                        this.flushRange = [],
                        this.segments = [],
                        this.appended = 0
                    }
                    this.onmso = this.onmse = this.onmsc = null,
                    this.hls.trigger(a.default.MEDIA_DETACHED)
                }
                ,
                r.prototype.onMediaSourceOpen = function() {
                    o.logger.log("media source opened"),
                    this.hls.trigger(a.default.MEDIA_ATTACHED, {
                        media: this.media
                    });
                    var t = this.mediaSource;
                    t && t.removeEventListener("sourceopen", this.onmso),
                    this.checkPendingTracks()
                }
                ,
                r.prototype.checkPendingTracks = function() {
                    var t = this.pendingTracks
                      , e = Object.keys(t).length;
                    e && (this.sourceBufferNb <= e || 0 === this.sourceBufferNb) && (this.createSourceBuffers(t),
                    this.pendingTracks = {},
                    this.doAppending())
                }
                ,
                r.prototype.onMediaSourceClose = function() {
                    o.logger.log("media source closed")
                }
                ,
                r.prototype.onMediaSourceEnded = function() {
                    o.logger.log("media source ended")
                }
                ,
                r.prototype.onSBUpdateEnd = function() {
                    if (this.audioTimestampOffset) {
                        var t = this.sourceBuffer.audio;
                        o.logger.warn("change mpeg audio timestamp offset from " + t.timestampOffset + " to " + this.audioTimestampOffset),
                        t.timestampOffset = this.audioTimestampOffset,
                        delete this.audioTimestampOffset
                    }
                    this._needsFlush && this.doFlush(),
                    this._needsEos && this.checkEos(),
                    this.appending = !1;
                    var e = this.parent
                      , r = this.segments.reduce(function(t, r) {
                        return r.parent === e ? t + 1 : t
                    }, 0)
                      , i = {}
                      , n = this.sourceBuffer;
                    for (var s in n)
                        i[s] = n[s].buffered;
                    this.hls.trigger(a.default.BUFFER_APPENDED, {
                        parent: e,
                        pending: r,
                        timeRanges: i
                    }),
                    this._needsFlush || this.doAppending(),
                    this.updateMediaElementDuration(),
                    0 === r && this.flushLiveBackBuffer()
                }
                ,
                r.prototype.onSBUpdateError = function(t) {
                    o.logger.error("sourceBuffer error:", t),
                    this.hls.trigger(a.default.ERROR, {
                        type: s.ErrorTypes.MEDIA_ERROR,
                        details: s.ErrorDetails.BUFFER_APPENDING_ERROR,
                        fatal: !1
                    })
                }
                ,
                r.prototype.onBufferReset = function() {
                    var t = this.sourceBuffer;
                    for (var e in t) {
                        var r = t[e];
                        try {
                            this.mediaSource.removeSourceBuffer(r),
                            r.removeEventListener("updateend", this.onsbue),
                            r.removeEventListener("error", this.onsbe)
                        } catch (t) {}
                    }
                    this.sourceBuffer = {},
                    this.flushRange = [],
                    this.segments = [],
                    this.appended = 0
                }
                ,
                r.prototype.onBufferCodecs = function(t) {
                    if (0 === Object.keys(this.sourceBuffer).length) {
                        for (var e in t)
                            this.pendingTracks[e] = t[e];
                        var r = this.mediaSource;
                        r && "open" === r.readyState && this.checkPendingTracks()
                    }
                }
                ,
                r.prototype.createSourceBuffers = function(t) {
                    var e = this.sourceBuffer
                      , r = this.mediaSource;
                    for (var i in t)
                        if (!e[i]) {
                            var n = t[i]
                              , l = n.levelCodec || n.codec
                              , u = n.container + ";codecs=" + l;
                            o.logger.log("creating sourceBuffer(" + u + ")");
                            try {
                                var d = e[i] = r.addSourceBuffer(u);
                                d.addEventListener("updateend", this.onsbue),
                                d.addEventListener("error", this.onsbe),
                                this.tracks[i] = {
                                    codec: l,
                                    container: n.container
                                },
                                n.buffer = d
                            } catch (t) {
                                o.logger.error("error while trying to add sourceBuffer:" + t.message),
                                this.hls.trigger(a.default.ERROR, {
                                    type: s.ErrorTypes.MEDIA_ERROR,
                                    details: s.ErrorDetails.BUFFER_ADD_CODEC_ERROR,
                                    fatal: !1,
                                    err: t,
                                    mimeType: u
                                })
                            }
                        }
                    this.hls.trigger(a.default.BUFFER_CREATED, {
                        tracks: t
                    })
                }
                ,
                r.prototype.onBufferAppending = function(t) {
                    this._needsFlush || (this.segments ? this.segments.push(t) : this.segments = [t],
                    this.doAppending())
                }
                ,
                r.prototype.onBufferAppendFail = function(t) {
                    o.logger.error("sourceBuffer error:", t.event),
                    this.hls.trigger(a.default.ERROR, {
                        type: s.ErrorTypes.MEDIA_ERROR,
                        details: s.ErrorDetails.BUFFER_APPENDING_ERROR,
                        fatal: !1
                    })
                }
                ,
                r.prototype.onBufferEos = function(t) {
                    var e = this.sourceBuffer
                      , r = t.type;
                    for (var i in e)
                        r && i !== r || e[i].ended || (e[i].ended = !0,
                        o.logger.log(i + " sourceBuffer now EOS"));
                    this.checkEos()
                }
                ,
                r.prototype.checkEos = function() {
                    var t = this.sourceBuffer
                      , e = this.mediaSource;
                    if (e && "open" === e.readyState) {
                        for (var r in t) {
                            var i = t[r];
                            if (!i.ended)
                                return;
                            if (i.updating)
                                return void (this._needsEos = !0)
                        }
                        o.logger.log("all media data are available, signal endOfStream() to MediaSource and stop loading fragment");
                        try {
                            e.endOfStream()
                        } catch (t) {
                            o.logger.warn("exception while calling mediaSource.endOfStream()")
                        }
                        this._needsEos = !1
                    } else
                        this._needsEos = !1
                }
                ,
                r.prototype.onBufferFlushing = function(t) {
                    this.flushRange.push({
                        start: t.startOffset,
                        end: t.endOffset,
                        type: t.type
                    }),
                    this.flushBufferCounter = 0,
                    this.doFlush()
                }
                ,
                r.prototype.flushLiveBackBuffer = function() {
                    if (this._live) {
                        var t = this.hls.config.liveBackBufferLength;
                        if (isFinite(t) && !(t < 0))
                            for (var e = this.media.currentTime, r = this.sourceBuffer, i = Object.keys(r), a = e - Math.max(t, this._levelTargetDuration), n = i.length - 1; n >= 0; n--) {
                                var o = i[n]
                                  , s = r[o].buffered;
                                s.length > 0 && a > s.start(0) && this.removeBufferRange(o, r[o], 0, a)
                            }
                    }
                }
                ,
                r.prototype.onLevelUpdated = function(t) {
                    var e = t.details;
                    e.fragments.length > 0 && (this._levelDuration = e.totalduration + e.fragments[0].start,
                    this._levelTargetDuration = e.averagetargetduration || e.targetduration || 10,
                    this._live = e.live,
                    this.updateMediaElementDuration())
                }
                ,
                r.prototype.updateMediaElementDuration = function() {
                    var e, r = this.hls.config;
                    if (null !== this._levelDuration && this.media && this.mediaSource && this.sourceBuffer && 0 !== this.media.readyState && "open" === this.mediaSource.readyState) {
                        for (var i in this.sourceBuffer)
                            if (!0 === this.sourceBuffer[i].updating)
                                return;
                        e = this.media.duration,
                        null === this._msDuration && (this._msDuration = this.mediaSource.duration),
                        !0 === this._live && !0 === r.liveDurationInfinity ? (o.logger.log("Media Source duration is set to Infinity"),
                        this._msDuration = this.mediaSource.duration = 1 / 0) : (this._levelDuration > this._msDuration && this._levelDuration > e || !t.isFinite(e)) && (o.logger.log("Updating Media Source duration to " + this._levelDuration.toFixed(3)),
                        this._msDuration = this.mediaSource.duration = this._levelDuration)
                    }
                }
                ,
                r.prototype.doFlush = function() {
                    for (; this.flushRange.length; ) {
                        var t = this.flushRange[0];
                        if (!this.flushBuffer(t.start, t.end, t.type))
                            return void (this._needsFlush = !0);
                        this.flushRange.shift(),
                        this.flushBufferCounter = 0
                    }
                    if (0 === this.flushRange.length) {
                        this._needsFlush = !1;
                        var e = 0
                          , r = this.sourceBuffer;
                        try {
                            for (var i in r)
                                e += r[i].buffered.length
                        } catch (t) {
                            o.logger.error("error while accessing sourceBuffer.buffered")
                        }
                        this.appended = e,
                        this.hls.trigger(a.default.BUFFER_FLUSHED)
                    }
                }
                ,
                r.prototype.doAppending = function() {
                    var t = this.hls
                      , e = this.segments
                      , r = this.sourceBuffer;
                    if (Object.keys(r).length) {
                        if (this.media.error)
                            return this.segments = [],
                            void o.logger.error("trying to append although a media error occured, flush segment and abort");
                        if (this.appending)
                            return;
                        if (e && e.length) {
                            var i = e.shift();
                            try {
                                var n = r[i.type];
                                n ? n.updating ? e.unshift(i) : (n.ended = !1,
                                this.parent = i.parent,
                                n.appendBuffer(i.data),
                                this.appendError = 0,
                                this.appended++,
                                this.appending = !0) : this.onSBUpdateEnd()
                            } catch (r) {
                                o.logger.error("error while trying to append buffer:" + r.message),
                                e.unshift(i);
                                var l = {
                                    type: s.ErrorTypes.MEDIA_ERROR,
                                    parent: i.parent
                                };
                                22 !== r.code ? (this.appendError ? this.appendError++ : this.appendError = 1,
                                l.details = s.ErrorDetails.BUFFER_APPEND_ERROR,
                                this.appendError > t.config.appendErrorMaxRetry ? (o.logger.log("fail " + t.config.appendErrorMaxRetry + " times to append segment in sourceBuffer"),
                                this.segments = [],
                                l.fatal = !0,
                                t.trigger(a.default.ERROR, l)) : (l.fatal = !1,
                                t.trigger(a.default.ERROR, l))) : (this.segments = [],
                                l.details = s.ErrorDetails.BUFFER_FULL_ERROR,
                                l.fatal = !1,
                                t.trigger(a.default.ERROR, l))
                            }
                        }
                    }
                }
                ,
                r.prototype.flushBuffer = function(t, e, r) {
                    var i, a = this.sourceBuffer;
                    if (Object.keys(a).length) {
                        if (o.logger.log("flushBuffer,pos/start/end: " + this.media.currentTime.toFixed(3) + "/" + t + "/" + e),
                        this.flushBufferCounter < this.appended) {
                            for (var n in a)
                                if (!r || n === r) {
                                    if ((i = a[n]).ended = !1,
                                    i.updating)
                                        return o.logger.warn("cannot flush, sb updating in progress"),
                                        !1;
                                    if (this.removeBufferRange(n, i, t, e))
                                        return this.flushBufferCounter++,
                                        !1
                                }
                        } else
                            o.logger.warn("abort flushing too many retries");
                        o.logger.log("buffer flushed")
                    }
                    return !0
                }
                ,
                r.prototype.removeBufferRange = function(t, e, r, i) {
                    try {
                        for (var a = 0; a < e.buffered.length; a++) {
                            var n = e.buffered.start(a)
                              , s = e.buffered.end(a)
                              , l = Math.max(n, r)
                              , u = Math.min(s, i);
                            if (Math.min(u, s) - l > .5)
                                return o.logger.log("sb remove " + t + " [" + l + "," + u + "], of [" + n + "," + s + "], pos:" + this.media.currentTime),
                                e.remove(l, u),
                                !0
                        }
                    } catch (t) {
                        o.logger.warn("removeBufferRange failed", t)
                    }
                    return !1
                }
                ,
                r
            }(n.default);
            e.default = u
        }
        ).call(this, r(3).Number)
    }
    , function(t, e, r) {
        "use strict";
        (function(t) {
            var i = this && this.__extends || function() {
                var t = Object.setPrototypeOf || {
                    __proto__: []
                }instanceof Array && function(t, e) {
                    t.__proto__ = e
                }
                || function(t, e) {
                    for (var r in e)
                        e.hasOwnProperty(r) && (t[r] = e[r])
                }
                ;
                return function(e, r) {
                    function i() {
                        this.constructor = e
                    }
                    t(e, r),
                    e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                    new i)
                }
            }();
            Object.defineProperty(e, "__esModule", {
                value: !0
            });
            var a = r(1)
              , n = function(e) {
                function r(r) {
                    var i = e.call(this, r, a.default.FPS_DROP_LEVEL_CAPPING, a.default.MEDIA_ATTACHING, a.default.MANIFEST_PARSED, a.default.BUFFER_CODECS, a.default.MEDIA_DETACHING) || this;
                    return i.autoLevelCapping = t.POSITIVE_INFINITY,
                    i.firstLevel = null,
                    i.levels = [],
                    i.media = null,
                    i.restrictedLevels = [],
                    i.timer = null,
                    i
                }
                return i(r, e),
                r.prototype.destroy = function() {
                    this.hls.config.capLevelToPlayerSize && (this.media = null,
                    this._stopCapping())
                }
                ,
                r.prototype.onFpsDropLevelCapping = function(t) {
                    r.isLevelAllowed(t.droppedLevel, this.restrictedLevels) && this.restrictedLevels.push(t.droppedLevel)
                }
                ,
                r.prototype.onMediaAttaching = function(t) {
                    this.media = t.media instanceof window.HTMLVideoElement ? t.media : null
                }
                ,
                r.prototype.onManifestParsed = function(t) {
                    var e = this.hls;
                    this.restrictedLevels = [],
                    this.levels = t.levels,
                    this.firstLevel = t.firstLevel,
                    e.config.capLevelToPlayerSize && (t.video || t.levels.length && t.altAudio) && this._startCapping()
                }
                ,
                r.prototype.onBufferCodecs = function(t) {
                    this.hls.config.capLevelToPlayerSize && t.video && this._startCapping()
                }
                ,
                r.prototype.onLevelsUpdated = function(t) {
                    this.levels = t.levels
                }
                ,
                r.prototype.onMediaDetaching = function() {
                    this._stopCapping()
                }
                ,
                r.prototype.detectPlayerSize = function() {
                    if (this.media) {
                        var t = this.levels ? this.levels.length : 0;
                        if (t) {
                            var e = this.hls;
                            e.autoLevelCapping = this.getMaxLevel(t - 1),
                            e.autoLevelCapping > this.autoLevelCapping && e.streamController.nextLevelSwitch(),
                            this.autoLevelCapping = e.autoLevelCapping
                        }
                    }
                }
                ,
                r.prototype.getMaxLevel = function(t) {
                    var e = this;
                    if (!this.levels)
                        return -1;
                    var i = this.levels.filter(function(i, a) {
                        return r.isLevelAllowed(a, e.restrictedLevels) && a <= t
                    });
                    return r.getMaxLevelByMediaSize(i, this.mediaWidth, this.mediaHeight)
                }
                ,
                r.prototype._startCapping = function() {
                    this.timer || (this.autoLevelCapping = t.POSITIVE_INFINITY,
                    this.hls.firstLevel = this.getMaxLevel(this.firstLevel),
                    clearInterval(this.timer),
                    this.timer = setInterval(this.detectPlayerSize.bind(this), 1e3),
                    this.detectPlayerSize())
                }
                ,
                r.prototype._stopCapping = function() {
                    this.restrictedLevels = [],
                    this.firstLevel = null,
                    this.autoLevelCapping = t.POSITIVE_INFINITY,
                    this.timer && (this.timer = clearInterval(this.timer),
                    this.timer = null)
                }
                ,
                Object.defineProperty(r.prototype, "mediaWidth", {
                    get: function() {
                        var t, e = this.media;
                        return e && (t = e.width || e.clientWidth || e.offsetWidth,
                        t *= r.contentScaleFactor),
                        t
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                Object.defineProperty(r.prototype, "mediaHeight", {
                    get: function() {
                        var t, e = this.media;
                        return e && (t = e.height || e.clientHeight || e.offsetHeight,
                        t *= r.contentScaleFactor),
                        t
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                Object.defineProperty(r, "contentScaleFactor", {
                    get: function() {
                        var t = 1;
                        try {
                            t = window.devicePixelRatio
                        } catch (t) {}
                        return t
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                r.isLevelAllowed = function(t, e) {
                    return void 0 === e && (e = []),
                    -1 === e.indexOf(t)
                }
                ,
                r.getMaxLevelByMediaSize = function(t, e, r) {
                    if (!t || t && !t.length)
                        return -1;
                    for (var i = function(t, e) {
                        return !e || (t.width !== e.width || t.height !== e.height)
                    }, a = t.length - 1, n = 0; n < t.length; n += 1) {
                        var o = t[n];
                        if ((o.width >= e || o.height >= r) && i(o, t[n + 1])) {
                            a = n;
                            break
                        }
                    }
                    return a
                }
                ,
                r
            }(r(4).default);
            e.default = n
        }
        ).call(this, r(3).Number)
    }
    , function(t, e, r) {
        "use strict";
        var i = this && this.__extends || function() {
            var t = Object.setPrototypeOf || {
                __proto__: []
            }instanceof Array && function(t, e) {
                t.__proto__ = e
            }
            || function(t, e) {
                for (var r in e)
                    e.hasOwnProperty(r) && (t[r] = e[r])
            }
            ;
            return function(e, r) {
                function i() {
                    this.constructor = e
                }
                t(e, r),
                e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                new i)
            }
        }();
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var a = r(1)
          , n = r(4)
          , o = r(0)
          , s = window.performance
          , l = function(t) {
            function e(e) {
                return t.call(this, e, a.default.MEDIA_ATTACHING) || this
            }
            return i(e, t),
            e.prototype.destroy = function() {
                this.timer && clearInterval(this.timer),
                this.isVideoPlaybackQualityAvailable = !1
            }
            ,
            e.prototype.onMediaAttaching = function(t) {
                var e = this.hls.config;
                e.capLevelOnFPSDrop && ("function" == typeof (this.video = t.media instanceof window.HTMLVideoElement ? t.media : null).getVideoPlaybackQuality && (this.isVideoPlaybackQualityAvailable = !0),
                clearInterval(this.timer),
                this.timer = setInterval(this.checkFPSInterval.bind(this), e.fpsDroppedMonitoringPeriod))
            }
            ,
            e.prototype.checkFPS = function(t, e, r) {
                var i = s.now();
                if (e) {
                    if (this.lastTime) {
                        var n = i - this.lastTime
                          , l = r - this.lastDroppedFrames
                          , u = e - this.lastDecodedFrames
                          , d = 1e3 * l / n
                          , c = this.hls;
                        if (c.trigger(a.default.FPS_DROP, {
                            currentDropped: l,
                            currentDecoded: u,
                            totalDroppedFrames: r
                        }),
                        d > 0 && l > c.config.fpsDroppedMonitoringThreshold * u) {
                            var f = c.currentLevel;
                            o.logger.warn("drop FPS ratio greater than max allowed value for currentLevel: " + f),
                            f > 0 && (-1 === c.autoLevelCapping || c.autoLevelCapping >= f) && (f -= 1,
                            c.trigger(a.default.FPS_DROP_LEVEL_CAPPING, {
                                level: f,
                                droppedLevel: c.currentLevel
                            }),
                            c.autoLevelCapping = f,
                            c.streamController.nextLevelSwitch())
                        }
                    }
                    this.lastTime = i,
                    this.lastDroppedFrames = r,
                    this.lastDecodedFrames = e
                }
            }
            ,
            e.prototype.checkFPSInterval = function() {
                var t = this.video;
                if (t)
                    if (this.isVideoPlaybackQualityAvailable) {
                        var e = t.getVideoPlaybackQuality();
                        this.checkFPS(t, e.totalVideoFrames, e.droppedVideoFrames)
                    } else
                        this.checkFPS(t, t.webkitDecodedFrameCount, t.webkitDroppedFrameCount)
            }
            ,
            e
        }(n.default);
        e.default = l
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(0)
          , a = window.performance
          , n = window.XMLHttpRequest
          , o = function() {
            function t(t) {
                t && t.xhrSetup && (this.xhrSetup = t.xhrSetup)
            }
            return t.prototype.destroy = function() {
                this.abort(),
                this.loader = null
            }
            ,
            t.prototype.abort = function() {
                var t = this.loader;
                t && 4 !== t.readyState && (this.stats.aborted = !0,
                t.abort()),
                window.clearTimeout(this.requestTimeout),
                this.requestTimeout = null,
                window.clearTimeout(this.retryTimeout),
                this.retryTimeout = null
            }
            ,
            t.prototype.load = function(t, e, r) {
                this.context = t,
                this.config = e,
                this.callbacks = r,
                this.stats = {
                    trequest: a.now(),
                    retry: 0
                },
                this.retryDelay = e.retryDelay,
                this.loadInternal()
            }
            ,
            t.prototype.loadInternal = function() {
                var t, e = this.context;
                t = this.loader = new n;
                var r = this.stats;
                r.tfirst = 0,
                r.loaded = 0;
                var i = this.xhrSetup;
                try {
                    if (i)
                        try {
                            i(t, e.url)
                        } catch (r) {
                            t.open("GET", e.url, !0),
                            i(t, e.url)
                        }
                    t.readyState || t.open("GET", e.url, !0)
                } catch (r) {
                    return void this.callbacks.onError({
                        code: t.status,
                        text: r.message
                    }, e, t)
                }
                e.rangeEnd && t.setRequestHeader("Range", "bytes=" + e.rangeStart + "-" + (e.rangeEnd - 1)),
                t.onreadystatechange = this.readystatechange.bind(this),
                t.onprogress = this.loadprogress.bind(this),
                t.responseType = e.responseType,
                this.requestTimeout = window.setTimeout(this.loadtimeout.bind(this), this.config.timeout),
                t.send()
            }
            ,
            t.prototype.readystatechange = function(t) {
                var e = t.currentTarget
                  , r = e.readyState
                  , n = this.stats
                  , o = this.context
                  , s = this.config;
                if (!n.aborted && r >= 2)
                    if (window.clearTimeout(this.requestTimeout),
                    0 === n.tfirst && (n.tfirst = Math.max(a.now(), n.trequest)),
                    4 === r) {
                        var l = e.status;
                        if (l >= 200 && l < 300) {
                            n.tload = Math.max(n.tfirst, a.now());
                            var u = void 0
                              , d = void 0;
                            d = "arraybuffer" === o.responseType ? (u = e.response).byteLength : (u = e.responseText).length,
                            n.loaded = n.total = d;
                            var c = {
                                url: e.responseURL,
                                data: u
                            };
                            this.callbacks.onSuccess(c, n, o, e)
                        } else
                            n.retry >= s.maxRetry || l >= 400 && l < 499 ? (i.logger.error(l + " while loading " + o.url),
                            this.callbacks.onError({
                                code: l,
                                text: e.statusText
                            }, o, e)) : (i.logger.warn(l + " while loading " + o.url + ", retrying in " + this.retryDelay + "..."),
                            this.destroy(),
                            this.retryTimeout = window.setTimeout(this.loadInternal.bind(this), this.retryDelay),
                            this.retryDelay = Math.min(2 * this.retryDelay, s.maxRetryDelay),
                            n.retry++)
                    } else
                        this.requestTimeout = window.setTimeout(this.loadtimeout.bind(this), s.timeout)
            }
            ,
            t.prototype.loadtimeout = function() {
                i.logger.warn("timeout while loading " + this.context.url),
                this.callbacks.onTimeout(this.stats, this.context, null)
            }
            ,
            t.prototype.loadprogress = function(t) {
                var e = t.currentTarget
                  , r = this.stats;
                r.loaded = t.loaded,
                t.lengthComputable && (r.total = t.total);
                var i = this.callbacks.onProgress;
                i && i(r, this.context, null, e)
            }
            ,
            t
        }();
        e.default = o
    }
    , function(t, e, r) {
        "use strict";
        var i = this && this.__extends || function() {
            var t = Object.setPrototypeOf || {
                __proto__: []
            }instanceof Array && function(t, e) {
                t.__proto__ = e
            }
            || function(t, e) {
                for (var r in e)
                    e.hasOwnProperty(r) && (t[r] = e[r])
            }
            ;
            return function(e, r) {
                function i() {
                    this.constructor = e
                }
                t(e, r),
                e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                new i)
            }
        }();
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var a = r(1)
          , n = r(10)
          , o = r(0)
          , s = r(2)
          , l = function(t) {
            function e(e) {
                var r = t.call(this, e, a.default.MANIFEST_LOADING, a.default.MANIFEST_PARSED, a.default.AUDIO_TRACK_LOADED, a.default.AUDIO_TRACK_SWITCHED, a.default.LEVEL_LOADED, a.default.ERROR) || this;
                return r._trackId = -1,
                r._selectDefaultTrack = !0,
                r.tracks = [],
                r.trackIdBlacklist = Object.create(null),
                r.audioGroupId = null,
                r
            }
            return i(e, t),
            e.prototype.onManifestLoading = function() {
                this.tracks = [],
                this._trackId = -1,
                this._selectDefaultTrack = !0
            }
            ,
            e.prototype.onManifestParsed = function(t) {
                var e = this.tracks = t.audioTracks || [];
                this.hls.trigger(a.default.AUDIO_TRACKS_UPDATED, {
                    audioTracks: e
                })
            }
            ,
            e.prototype.onAudioTrackLoaded = function(t) {
                if (t.id >= this.tracks.length)
                    o.logger.warn("Invalid audio track id:", t.id);
                else {
                    if (o.logger.log("audioTrack " + t.id + " loaded"),
                    this.tracks[t.id].details = t.details,
                    t.details.live && !this.hasInterval()) {
                        var e = 1e3 * t.details.targetduration;
                        this.setInterval(e)
                    }
                    !t.details.live && this.hasInterval() && this.clearInterval()
                }
            }
            ,
            e.prototype.onAudioTrackSwitched = function(t) {
                var e = this.tracks[t.id].groupId;
                e && this.audioGroupId !== e && (this.audioGroupId = e)
            }
            ,
            e.prototype.onLevelLoaded = function(t) {
                var e = this.hls.levels[t.level];
                if (e.audioGroupIds) {
                    var r = e.audioGroupIds[e.urlId];
                    this.audioGroupId !== r && (this.audioGroupId = r,
                    this._selectInitialAudioTrack())
                }
            }
            ,
            e.prototype.onError = function(t) {
                t.type === s.ErrorTypes.NETWORK_ERROR && (t.fatal && this.clearInterval(),
                t.details === s.ErrorDetails.AUDIO_TRACK_LOAD_ERROR && (o.logger.warn("Network failure on audio-track id:", t.context.id),
                this._handleLoadError()))
            }
            ,
            Object.defineProperty(e.prototype, "audioTracks", {
                get: function() {
                    return this.tracks
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "audioTrack", {
                get: function() {
                    return this._trackId
                },
                set: function(t) {
                    this._setAudioTrack(t),
                    this._selectDefaultTrack = !1
                },
                enumerable: !0,
                configurable: !0
            }),
            e.prototype._setAudioTrack = function(t) {
                if (this._trackId === t && this.tracks[this._trackId].details)
                    o.logger.debug("Same id as current audio-track passed, and track details available -> no-op");
                else if (t < 0 || t >= this.tracks.length)
                    o.logger.warn("Invalid id passed to audio-track controller");
                else {
                    var e = this.tracks[t];
                    o.logger.log("Now switching to audio-track index " + t),
                    this.clearInterval(),
                    this._trackId = t;
                    var r = e.url
                      , i = e.type
                      , n = e.id;
                    this.hls.trigger(a.default.AUDIO_TRACK_SWITCHING, {
                        id: n,
                        type: i,
                        url: r
                    }),
                    this._loadTrackDetailsIfNeeded(e)
                }
            }
            ,
            e.prototype.doTick = function() {
                this._updateTrack(this._trackId)
            }
            ,
            e.prototype._selectInitialAudioTrack = function() {
                var t = this
                  , e = this.tracks;
                if (e.length) {
                    var r = this.tracks[this._trackId]
                      , i = null;
                    if (r && (i = r.name),
                    this._selectDefaultTrack) {
                        var n = e.filter(function(t) {
                            return t.default
                        });
                        n.length ? e = n : o.logger.warn("No default audio tracks defined")
                    }
                    var l = !1
                      , u = function() {
                        e.forEach(function(e) {
                            l || t.audioGroupId && e.groupId !== t.audioGroupId || i && i !== e.name || (t._setAudioTrack(e.id),
                            l = !0)
                        })
                    };
                    u(),
                    l || (i = null,
                    u()),
                    l || (o.logger.error("No track found for running audio group-ID: " + this.audioGroupId),
                    this.hls.trigger(a.default.ERROR, {
                        type: s.ErrorTypes.MEDIA_ERROR,
                        details: s.ErrorDetails.AUDIO_TRACK_LOAD_ERROR,
                        fatal: !0
                    }))
                }
            }
            ,
            e.prototype._needsTrackLoading = function(t) {
                var e = t.details
                  , r = t.url;
                return !(e && !e.live) && !!r
            }
            ,
            e.prototype._loadTrackDetailsIfNeeded = function(t) {
                if (this._needsTrackLoading(t)) {
                    var e = t.url
                      , r = t.id;
                    o.logger.log("loading audio-track playlist for id: " + r),
                    this.hls.trigger(a.default.AUDIO_TRACK_LOADING, {
                        url: e,
                        id: r
                    })
                }
            }
            ,
            e.prototype._updateTrack = function(t) {
                if (!(t < 0 || t >= this.tracks.length)) {
                    this.clearInterval(),
                    this._trackId = t,
                    o.logger.log("trying to update audio-track " + t);
                    var e = this.tracks[t];
                    this._loadTrackDetailsIfNeeded(e)
                }
            }
            ,
            e.prototype._handleLoadError = function() {
                this.trackIdBlacklist[this._trackId] = !0;
                var t = this._trackId
                  , e = this.tracks[t]
                  , r = e.name
                  , i = e.language
                  , a = e.groupId;
                o.logger.warn("Loading failed on audio track id: " + t + ", group-id: " + a + ', name/language: "' + r + '" / "' + i + '"');
                for (var n = t, s = 0; s < this.tracks.length; s++) {
                    if (!this.trackIdBlacklist[s])
                        if (this.tracks[s].name === r) {
                            n = s;
                            break
                        }
                }
                n !== t ? (o.logger.log("Attempting audio-track fallback id:", n, "group-id:", this.tracks[n].groupId),
                this._setAudioTrack(n)) : o.logger.warn('No fallback audio-track found for name/language: "' + r + '" / "' + i + '"')
            }
            ,
            e
        }(n.default);
        e.default = l
    }
    , function(t, e, r) {
        "use strict";
        (function(t) {
            var i = this && this.__extends || function() {
                var t = Object.setPrototypeOf || {
                    __proto__: []
                }instanceof Array && function(t, e) {
                    t.__proto__ = e
                }
                || function(t, e) {
                    for (var r in e)
                        e.hasOwnProperty(r) && (t[r] = e[r])
                }
                ;
                return function(e, r) {
                    function i() {
                        this.constructor = e
                    }
                    t(e, r),
                    e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                    new i)
                }
            }();
            Object.defineProperty(e, "__esModule", {
                value: !0
            });
            var a = r(7)
              , n = r(8)
              , o = r(20)
              , s = r(1)
              , l = r(15)
              , u = r(25)
              , d = r(2)
              , c = r(0)
              , f = r(26)
              , h = r(10)
              , p = r(12)
              , g = r(11)
              , v = window.performance
              , y = {
                STOPPED: "STOPPED",
                STARTING: "STARTING",
                IDLE: "IDLE",
                PAUSED: "PAUSED",
                KEY_LOADING: "KEY_LOADING",
                FRAG_LOADING: "FRAG_LOADING",
                FRAG_LOADING_WAITING_RETRY: "FRAG_LOADING_WAITING_RETRY",
                WAITING_TRACK: "WAITING_TRACK",
                PARSING: "PARSING",
                PARSED: "PARSED",
                BUFFER_FLUSHING: "BUFFER_FLUSHING",
                ENDED: "ENDED",
                ERROR: "ERROR",
                WAITING_INIT_PTS: "WAITING_INIT_PTS"
            }
              , m = function(e) {
                function r(t, r) {
                    var i = e.call(this, t, s.default.MEDIA_ATTACHED, s.default.MEDIA_DETACHING, s.default.AUDIO_TRACKS_UPDATED, s.default.AUDIO_TRACK_SWITCHING, s.default.AUDIO_TRACK_LOADED, s.default.KEY_LOADED, s.default.FRAG_LOADED, s.default.FRAG_PARSING_INIT_SEGMENT, s.default.FRAG_PARSING_DATA, s.default.FRAG_PARSED, s.default.ERROR, s.default.BUFFER_RESET, s.default.BUFFER_CREATED, s.default.BUFFER_APPENDED, s.default.BUFFER_FLUSHED, s.default.INIT_PTS_FOUND) || this;
                    return i.fragmentTracker = r,
                    i.config = t.config,
                    i.audioCodecSwap = !1,
                    i._state = y.STOPPED,
                    i.initPTS = [],
                    i.waitingFragment = null,
                    i.videoTrackCC = null,
                    i
                }
                return i(r, e),
                r.prototype.onHandlerDestroying = function() {
                    this.stopLoad(),
                    e.prototype.onHandlerDestroying.call(this)
                }
                ,
                r.prototype.onHandlerDestroyed = function() {
                    this.state = y.STOPPED,
                    this.fragmentTracker = null,
                    e.prototype.onHandlerDestroyed.call(this)
                }
                ,
                r.prototype.onInitPtsFound = function(t) {
                    var e = t.id
                      , r = t.frag.cc
                      , i = t.initPTS;
                    "main" === e && (this.initPTS[r] = i,
                    this.videoTrackCC = r,
                    c.logger.log("InitPTS for cc: " + r + " found from video track: " + i),
                    this.state === y.WAITING_INIT_PTS && this.tick())
                }
                ,
                r.prototype.startLoad = function(t) {
                    if (this.tracks) {
                        var e = this.lastCurrentTime;
                        this.stopLoad(),
                        this.setInterval(100),
                        this.fragLoadError = 0,
                        e > 0 && -1 === t ? (c.logger.log("audio:override startPosition with lastCurrentTime @" + e.toFixed(3)),
                        this.state = y.IDLE) : (this.lastCurrentTime = this.startPosition ? this.startPosition : t,
                        this.state = y.STARTING),
                        this.nextLoadPosition = this.startPosition = this.lastCurrentTime,
                        this.tick()
                    } else
                        this.startPosition = t,
                        this.state = y.STOPPED
                }
                ,
                r.prototype.stopLoad = function() {
                    var t = this.fragCurrent;
                    t && (t.loader && t.loader.abort(),
                    this.fragmentTracker.removeFragment(t),
                    this.fragCurrent = null),
                    this.fragPrevious = null,
                    this.demuxer && (this.demuxer.destroy(),
                    this.demuxer = null),
                    this.state = y.STOPPED
                }
                ,
                Object.defineProperty(r.prototype, "state", {
                    get: function() {
                        return this._state
                    },
                    set: function(t) {
                        if (this.state !== t) {
                            var e = this.state;
                            this._state = t,
                            c.logger.log("audio stream:" + e + "->" + t)
                        }
                    },
                    enumerable: !0,
                    configurable: !0
                }),
                r.prototype.doTick = function() {
                    var e, r, i, o = this.hls, l = o.config;
                    switch (this.state) {
                    case y.ERROR:
                    case y.PAUSED:
                    case y.BUFFER_FLUSHING:
                        break;
                    case y.STARTING:
                        this.state = y.WAITING_TRACK,
                        this.loadedmetadata = !1;
                        break;
                    case y.IDLE:
                        var u = this.tracks;
                        if (!u)
                            break;
                        if (!this.media && (this.startFragRequested || !l.startFragPrefetch))
                            break;
                        if (this.loadedmetadata)
                            e = this.media.currentTime;
                        else if (void 0 === (e = this.nextLoadPosition))
                            break;
                        var d = this.mediaBuffer ? this.mediaBuffer : this.media
                          , h = this.videoBuffer ? this.videoBuffer : this.media
                          , g = n.BufferHelper.bufferInfo(d, e, l.maxBufferHole)
                          , m = n.BufferHelper.bufferInfo(h, e, l.maxBufferHole)
                          , _ = g.len
                          , E = g.end
                          , T = this.fragPrevious
                          , S = Math.min(l.maxBufferLength, l.maxMaxBufferLength)
                          , b = Math.max(S, m.len)
                          , A = this.audioSwitch
                          , R = this.trackId;
                        if ((_ < b || A) && R < u.length) {
                            if (void 0 === (i = u[R].details)) {
                                this.state = y.WAITING_TRACK;
                                break
                            }
                            if (!A && !i.live && T && T.sn === i.endSN && !g.nextStart && (!this.media.seeking || this.media.duration - E < T.duration / 2)) {
                                this.hls.trigger(s.default.BUFFER_EOS, {
                                    type: "audio"
                                }),
                                this.state = y.ENDED;
                                break
                            }
                            var D = i.fragments
                              , L = D.length
                              , w = D[0].start
                              , k = D[L - 1].start + D[L - 1].duration
                              , O = void 0;
                            if (A)
                                if (i.live && !i.PTSKnown)
                                    c.logger.log("switching audiotrack, live stream, unknown PTS,load first fragment"),
                                    E = 0;
                                else if (E = e,
                                i.PTSKnown && e < w) {
                                    if (!(g.end > w || g.nextStart))
                                        return;
                                    c.logger.log("alt audio track ahead of main track, seek to start of alt audio track"),
                                    this.media.currentTime = w + .05
                                }
                            if (i.initSegment && !i.initSegment.data)
                                O = i.initSegment;
                            else if (E <= w) {
                                if (O = D[0],
                                null !== this.videoTrackCC && O.cc !== this.videoTrackCC && (O = f.findFragWithCC(D, this.videoTrackCC)),
                                i.live && O.loadIdx && O.loadIdx === this.fragLoadIdx) {
                                    var I = g.nextStart ? g.nextStart : w;
                                    return c.logger.log("no alt audio available @currentTime:" + this.media.currentTime + ", seeking @" + (I + .05)),
                                    void (this.media.currentTime = I + .05)
                                }
                            } else {
                                var P = void 0
                                  , C = l.maxFragLookUpTolerance
                                  , x = T ? D[T.sn - D[0].sn + 1] : void 0
                                  , F = function(t) {
                                    var e = Math.min(C, t.duration);
                                    return t.start + t.duration - e <= E ? 1 : t.start - e > E && t.start ? -1 : 0
                                };
                                E < k ? (E > k - C && (C = 0),
                                P = x && !F(x) ? x : a.default.search(D, F)) : P = D[L - 1],
                                P && (O = P,
                                w = P.start,
                                T && O.level === T.level && O.sn === T.sn && (O.sn < i.endSN ? (O = D[O.sn + 1 - i.startSN],
                                c.logger.log("SN just loaded, load next one: " + O.sn)) : O = null))
                            }
                            O && (O.encrypted ? (c.logger.log("Loading key for " + O.sn + " of [" + i.startSN + " ," + i.endSN + "],track " + R),
                            this.state = y.KEY_LOADING,
                            o.trigger(s.default.KEY_LOADING, {
                                frag: O
                            })) : (c.logger.log("Loading " + O.sn + ", cc: " + O.cc + " of [" + i.startSN + " ," + i.endSN + "],track " + R + ", currentTime:" + e + ",bufferEnd:" + E.toFixed(3)),
                            (A || this.fragmentTracker.getState(O) === p.FragmentState.NOT_LOADED) && (this.fragCurrent = O,
                            this.startFragRequested = !0,
                            t.isFinite(O.sn) && (this.nextLoadPosition = O.start + O.duration),
                            o.trigger(s.default.FRAG_LOADING, {
                                frag: O
                            }),
                            this.state = y.FRAG_LOADING)))
                        }
                        break;
                    case y.WAITING_TRACK:
                        (r = this.tracks[this.trackId]) && r.details && (this.state = y.IDLE);
                        break;
                    case y.FRAG_LOADING_WAITING_RETRY:
                        var M = v.now()
                          , B = this.retryDate
                          , N = (d = this.media) && d.seeking;
                        (!B || M >= B || N) && (c.logger.log("audioStreamController: retryDate reached, switch back to IDLE state"),
                        this.state = y.IDLE);
                        break;
                    case y.WAITING_INIT_PTS:
                        var U = this.videoTrackCC;
                        if (void 0 === this.initPTS[U])
                            break;
                        var G = this.waitingFragment;
                        if (G) {
                            var j = G.frag.cc;
                            U !== j ? (r = this.tracks[this.trackId]).details && r.details.live && (c.logger.warn("Waiting fragment CC (" + j + ") does not match video track CC (" + U + ")"),
                            this.waitingFragment = null,
                            this.state = y.IDLE) : (this.state = y.FRAG_LOADING,
                            this.onFragLoaded(this.waitingFragment),
                            this.waitingFragment = null)
                        } else
                            this.state = y.IDLE;
                        break;
                    case y.STOPPED:
                    case y.FRAG_LOADING:
                    case y.PARSING:
                    case y.PARSED:
                    case y.ENDED:
                    }
                }
                ,
                r.prototype.onMediaAttached = function(t) {
                    var e = this.media = this.mediaBuffer = t.media;
                    this.onvseeking = this.onMediaSeeking.bind(this),
                    this.onvended = this.onMediaEnded.bind(this),
                    e.addEventListener("seeking", this.onvseeking),
                    e.addEventListener("ended", this.onvended);
                    var r = this.config;
                    this.tracks && r.autoStartLoad && this.startLoad(r.startPosition)
                }
                ,
                r.prototype.onMediaDetaching = function() {
                    var t = this.media;
                    t && t.ended && (c.logger.log("MSE detaching and video ended, reset startPosition"),
                    this.startPosition = this.lastCurrentTime = 0),
                    t && (t.removeEventListener("seeking", this.onvseeking),
                    t.removeEventListener("ended", this.onvended),
                    this.onvseeking = this.onvseeked = this.onvended = null),
                    this.media = this.mediaBuffer = this.videoBuffer = null,
                    this.loadedmetadata = !1,
                    this.stopLoad()
                }
                ,
                r.prototype.onMediaSeeking = function() {
                    this.state === y.ENDED && (this.state = y.IDLE),
                    this.media && (this.lastCurrentTime = this.media.currentTime),
                    this.tick()
                }
                ,
                r.prototype.onMediaEnded = function() {
                    this.startPosition = this.lastCurrentTime = 0
                }
                ,
                r.prototype.onAudioTracksUpdated = function(t) {
                    c.logger.log("audio tracks updated"),
                    this.tracks = t.audioTracks
                }
                ,
                r.prototype.onAudioTrackSwitching = function(t) {
                    var e = !!t.url;
                    this.trackId = t.id,
                    this.fragCurrent = null,
                    this.state = y.PAUSED,
                    this.waitingFragment = null,
                    e ? this.setInterval(100) : this.demuxer && (this.demuxer.destroy(),
                    this.demuxer = null),
                    e && (this.audioSwitch = !0,
                    this.state = y.IDLE),
                    this.tick()
                }
                ,
                r.prototype.onAudioTrackLoaded = function(e) {
                    var r = e.details
                      , i = e.id
                      , a = this.tracks[i]
                      , n = r.totalduration
                      , o = 0;
                    if (c.logger.log("track " + i + " loaded [" + r.startSN + "," + r.endSN + "],duration:" + n),
                    r.live) {
                        var s = a.details;
                        s && r.fragments.length > 0 ? (l.mergeDetails(s, r),
                        o = r.fragments[0].start,
                        r.PTSKnown ? c.logger.log("live audio playlist sliding:" + o.toFixed(3)) : c.logger.log("live audio playlist - outdated PTS, unknown sliding")) : (r.PTSKnown = !1,
                        c.logger.log("live audio playlist - first load, unknown sliding"))
                    } else
                        r.PTSKnown = !1;
                    if (a.details = r,
                    !this.startFragRequested) {
                        if (-1 === this.startPosition) {
                            var u = r.startTimeOffset;
                            t.isFinite(u) ? (c.logger.log("start time offset found in playlist, adjust startPosition to " + u),
                            this.startPosition = u) : this.startPosition = 0
                        }
                        this.nextLoadPosition = this.startPosition
                    }
                    this.state === y.WAITING_TRACK && (this.state = y.IDLE),
                    this.tick()
                }
                ,
                r.prototype.onKeyLoaded = function() {
                    this.state === y.KEY_LOADING && (this.state = y.IDLE,
                    this.tick())
                }
                ,
                r.prototype.onFragLoaded = function(t) {
                    var e = this.fragCurrent
                      , r = t.frag;
                    if (this.state === y.FRAG_LOADING && e && "audio" === r.type && r.level === e.level && r.sn === e.sn) {
                        var i = this.tracks[this.trackId]
                          , a = i.details
                          , n = a.totalduration
                          , l = e.level
                          , u = e.sn
                          , d = e.cc
                          , f = this.config.defaultAudioCodec || i.audioCodec || "mp4a.40.2"
                          , h = this.stats = t.stats;
                        if ("initSegment" === u)
                            this.state = y.IDLE,
                            h.tparsed = h.tbuffered = v.now(),
                            a.initSegment.data = t.payload,
                            this.hls.trigger(s.default.FRAG_BUFFERED, {
                                stats: h,
                                frag: e,
                                id: "audio"
                            }),
                            this.tick();
                        else {
                            this.state = y.PARSING,
                            this.appended = !1,
                            this.demuxer || (this.demuxer = new o.default(this.hls,"audio"));
                            var p = this.initPTS[d]
                              , g = a.initSegment ? a.initSegment.data : [];
                            if (a.initSegment || void 0 !== p) {
                                this.pendingBuffering = !0,
                                c.logger.log("Demuxing " + u + " of [" + a.startSN + " ," + a.endSN + "],track " + l);
                                this.demuxer.push(t.payload, g, f, null, e, n, !1, p)
                            } else
                                c.logger.log("unknown video PTS for continuity counter " + d + ", waiting for video PTS before demuxing audio frag " + u + " of [" + a.startSN + " ," + a.endSN + "],track " + l),
                                this.waitingFragment = t,
                                this.state = y.WAITING_INIT_PTS
                        }
                    }
                    this.fragLoadError = 0
                }
                ,
                r.prototype.onFragParsingInitSegment = function(t) {
                    var e = this.fragCurrent
                      , r = t.frag;
                    if (e && "audio" === t.id && r.sn === e.sn && r.level === e.level && this.state === y.PARSING) {
                        var i = t.tracks
                          , a = void 0;
                        if (i.video && delete i.video,
                        a = i.audio) {
                            a.levelCodec = a.codec,
                            a.id = t.id,
                            this.hls.trigger(s.default.BUFFER_CODECS, i),
                            c.logger.log("audio track:audio,container:" + a.container + ",codecs[level/parsed]=[" + a.levelCodec + "/" + a.codec + "]");
                            var n = a.initSegment;
                            if (n) {
                                var o = {
                                    type: "audio",
                                    data: n,
                                    parent: "audio",
                                    content: "initSegment"
                                };
                                this.audioSwitch ? this.pendingData = [o] : (this.appended = !0,
                                this.pendingBuffering = !0,
                                this.hls.trigger(s.default.BUFFER_APPENDING, o))
                            }
                            this.tick()
                        }
                    }
                }
                ,
                r.prototype.onFragParsingData = function(e) {
                    var r = this
                      , i = this.fragCurrent
                      , a = e.frag;
                    if (i && "audio" === e.id && "audio" === e.type && a.sn === i.sn && a.level === i.level && this.state === y.PARSING) {
                        var n = this.trackId
                          , o = this.tracks[n]
                          , u = this.hls;
                        t.isFinite(e.endPTS) || (e.endPTS = e.startPTS + i.duration,
                        e.endDTS = e.startDTS + i.duration),
                        i.addElementaryStream(g.default.ElementaryStreamTypes.AUDIO),
                        c.logger.log("parsed " + e.type + ",PTS:[" + e.startPTS.toFixed(3) + "," + e.endPTS.toFixed(3) + "],DTS:[" + e.startDTS.toFixed(3) + "/" + e.endDTS.toFixed(3) + "],nb:" + e.nb),
                        l.updateFragPTSDTS(o.details, i, e.startPTS, e.endPTS);
                        var f = this.audioSwitch
                          , h = this.media
                          , p = !1;
                        if (f && h)
                            if (h.readyState) {
                                var v = h.currentTime;
                                c.logger.log("switching audio track : currentTime:" + v),
                                v >= e.startPTS && (c.logger.log("switching audio track : flushing all audio"),
                                this.state = y.BUFFER_FLUSHING,
                                u.trigger(s.default.BUFFER_FLUSHING, {
                                    startOffset: 0,
                                    endOffset: t.POSITIVE_INFINITY,
                                    type: "audio"
                                }),
                                p = !0,
                                this.audioSwitch = !1,
                                u.trigger(s.default.AUDIO_TRACK_SWITCHED, {
                                    id: n
                                }))
                            } else
                                this.audioSwitch = !1,
                                u.trigger(s.default.AUDIO_TRACK_SWITCHED, {
                                    id: n
                                });
                        var m = this.pendingData;
                        if (!m)
                            return c.logger.warn("Apparently attempt to enqueue media payload without codec initialization data upfront"),
                            void u.trigger(s.default.ERROR, {
                                type: d.ErrorTypes.MEDIA_ERROR,
                                details: null,
                                fatal: !0
                            });
                        this.audioSwitch || ([e.data1, e.data2].forEach(function(t) {
                            t && t.length && m.push({
                                type: e.type,
                                data: t,
                                parent: "audio",
                                content: "data"
                            })
                        }),
                        !p && m.length && (m.forEach(function(t) {
                            r.state === y.PARSING && (r.pendingBuffering = !0,
                            r.hls.trigger(s.default.BUFFER_APPENDING, t))
                        }),
                        this.pendingData = [],
                        this.appended = !0)),
                        this.tick()
                    }
                }
                ,
                r.prototype.onFragParsed = function(t) {
                    var e = this.fragCurrent
                      , r = t.frag;
                    e && "audio" === t.id && r.sn === e.sn && r.level === e.level && this.state === y.PARSING && (this.stats.tparsed = v.now(),
                    this.state = y.PARSED,
                    this._checkAppendedParsed())
                }
                ,
                r.prototype.onBufferReset = function() {
                    this.mediaBuffer = this.videoBuffer = null,
                    this.loadedmetadata = !1
                }
                ,
                r.prototype.onBufferCreated = function(t) {
                    var e = t.tracks.audio;
                    e && (this.mediaBuffer = e.buffer,
                    this.loadedmetadata = !0),
                    t.tracks.video && (this.videoBuffer = t.tracks.video.buffer)
                }
                ,
                r.prototype.onBufferAppended = function(t) {
                    if ("audio" === t.parent) {
                        var e = this.state;
                        e !== y.PARSING && e !== y.PARSED || (this.pendingBuffering = t.pending > 0,
                        this._checkAppendedParsed())
                    }
                }
                ,
                r.prototype._checkAppendedParsed = function() {
                    if (!(this.state !== y.PARSED || this.appended && this.pendingBuffering)) {
                        var t = this.fragCurrent
                          , e = this.stats
                          , r = this.hls;
                        if (t) {
                            this.fragPrevious = t,
                            e.tbuffered = v.now(),
                            r.trigger(s.default.FRAG_BUFFERED, {
                                stats: e,
                                frag: t,
                                id: "audio"
                            });
                            var i = this.mediaBuffer ? this.mediaBuffer : this.media;
                            c.logger.log("audio buffered : " + u.default.toString(i.buffered)),
                            this.audioSwitch && this.appended && (this.audioSwitch = !1,
                            r.trigger(s.default.AUDIO_TRACK_SWITCHED, {
                                id: this.trackId
                            })),
                            this.state = y.IDLE
                        }
                        this.tick()
                    }
                }
                ,
                r.prototype.onError = function(e) {
                    var r = e.frag;
                    if (!r || "audio" === r.type)
                        switch (e.details) {
                        case d.ErrorDetails.FRAG_LOAD_ERROR:
                        case d.ErrorDetails.FRAG_LOAD_TIMEOUT:
                            var i = e.frag;
                            if (i && "audio" !== i.type)
                                break;
                            if (!e.fatal) {
                                var a = this.fragLoadError;
                                if (a ? a++ : a = 1,
                                a <= (l = this.config).fragLoadingMaxRetry) {
                                    this.fragLoadError = a;
                                    var o = Math.min(Math.pow(2, a - 1) * l.fragLoadingRetryDelay, l.fragLoadingMaxRetryTimeout);
                                    c.logger.warn("AudioStreamController: frag loading failed, retry in " + o + " ms"),
                                    this.retryDate = v.now() + o,
                                    this.state = y.FRAG_LOADING_WAITING_RETRY
                                } else
                                    c.logger.error("AudioStreamController: " + e.details + " reaches max retry, redispatch as fatal ..."),
                                    e.fatal = !0,
                                    this.state = y.ERROR
                            }
                            break;
                        case d.ErrorDetails.AUDIO_TRACK_LOAD_ERROR:
                        case d.ErrorDetails.AUDIO_TRACK_LOAD_TIMEOUT:
                        case d.ErrorDetails.KEY_LOAD_ERROR:
                        case d.ErrorDetails.KEY_LOAD_TIMEOUT:
                            this.state !== y.ERROR && (this.state = e.fatal ? y.ERROR : y.IDLE,
                            c.logger.warn("AudioStreamController: " + e.details + " while loading frag, now switching to " + this.state + " state ..."));
                            break;
                        case d.ErrorDetails.BUFFER_FULL_ERROR:
                            if ("audio" === e.parent && (this.state === y.PARSING || this.state === y.PARSED)) {
                                var l, u = this.mediaBuffer, f = this.media.currentTime;
                                if (u && n.BufferHelper.isBuffered(u, f) && n.BufferHelper.isBuffered(u, f + .5))
                                    (l = this.config).maxMaxBufferLength >= l.maxBufferLength && (l.maxMaxBufferLength /= 2,
                                    c.logger.warn("AudioStreamController: reduce max buffer length to " + l.maxMaxBufferLength + "s")),
                                    this.state = y.IDLE;
                                else
                                    c.logger.warn("AudioStreamController: buffer full error also media.currentTime is not buffered, flush audio buffer"),
                                    this.fragCurrent = null,
                                    this.state = y.BUFFER_FLUSHING,
                                    this.hls.trigger(s.default.BUFFER_FLUSHING, {
                                        startOffset: 0,
                                        endOffset: t.POSITIVE_INFINITY,
                                        type: "audio"
                                    })
                            }
                        }
                }
                ,
                r.prototype.onBufferFlushed = function() {
                    var t = this
                      , e = this.pendingData;
                    e && e.length ? (c.logger.log("AudioStreamController: appending pending audio data after buffer flushed"),
                    e.forEach(function(e) {
                        t.hls.trigger(s.default.BUFFER_APPENDING, e)
                    }),
                    this.appended = !0,
                    this.pendingData = [],
                    this.state = y.PARSED) : (this.state = y.IDLE,
                    this.fragPrevious = null,
                    this.tick())
                }
                ,
                r
            }(h.default);
            e.default = m
        }
        ).call(this, r(3).Number)
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = r(28);
        e.newCue = function(t, e, r, a) {
            for (var n, o, s, l, u, d = window.VTTCue || window.TextTrackCue, c = 0; c < a.rows.length; c++)
                if (s = !0,
                l = 0,
                u = "",
                !(n = a.rows[c]).isEmpty()) {
                    for (var f = 0; f < n.chars.length; f++)
                        n.chars[f].uchar.match(/\s/) && s ? l++ : (u += n.chars[f].uchar,
                        s = !1);
                    n.cueStartTime = e,
                    e === r && (r += 1e-4),
                    o = new d(e,r,i.fixLineBreaks(u.trim())),
                    l >= 16 ? l-- : l++,
                    navigator.userAgent.match(/Firefox\//) ? o.line = c + 1 : o.line = c > 7 ? c - 2 : c + 1,
                    o.align = "left",
                    o.position = Math.max(0, Math.min(100, l / 32 * 100 + (navigator.userAgent.match(/Firefox\//) ? 50 : 0))),
                    t.addCue(o)
                }
        }
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        }),
        e.default = function() {
            if ("undefined" != typeof window && window.VTTCue)
                return window.VTTCue;
            var t = "auto"
              , e = {
                "": !0,
                lr: !0,
                rl: !0
            }
              , r = {
                start: !0,
                middle: !0,
                end: !0,
                left: !0,
                right: !0
            };
            function i(t) {
                return "string" == typeof t && (!!r[t.toLowerCase()] && t.toLowerCase())
            }
            function a(t) {
                for (var e = 1; e < arguments.length; e++) {
                    var r = arguments[e];
                    for (var i in r)
                        t[i] = r[i]
                }
                return t
            }
            function n(r, n, o) {
                var s = this
                  , l = function() {
                    if ("undefined" != typeof navigator)
                        return /MSIE\s8\.0/.test(navigator.userAgent)
                }()
                  , u = {};
                l ? s = document.createElement("custom") : u.enumerable = !0,
                s.hasBeenReset = !1;
                var d = ""
                  , c = !1
                  , f = r
                  , h = n
                  , p = o
                  , g = null
                  , v = ""
                  , y = !0
                  , m = "auto"
                  , _ = "start"
                  , E = 50
                  , T = "middle"
                  , S = 50
                  , b = "middle";
                if (Object.defineProperty(s, "id", a({}, u, {
                    get: function() {
                        return d
                    },
                    set: function(t) {
                        d = "" + t
                    }
                })),
                Object.defineProperty(s, "pauseOnExit", a({}, u, {
                    get: function() {
                        return c
                    },
                    set: function(t) {
                        c = !!t
                    }
                })),
                Object.defineProperty(s, "startTime", a({}, u, {
                    get: function() {
                        return f
                    },
                    set: function(t) {
                        if ("number" != typeof t)
                            throw new TypeError("Start time must be set to a number.");
                        f = t,
                        this.hasBeenReset = !0
                    }
                })),
                Object.defineProperty(s, "endTime", a({}, u, {
                    get: function() {
                        return h
                    },
                    set: function(t) {
                        if ("number" != typeof t)
                            throw new TypeError("End time must be set to a number.");
                        h = t,
                        this.hasBeenReset = !0
                    }
                })),
                Object.defineProperty(s, "text", a({}, u, {
                    get: function() {
                        return p
                    },
                    set: function(t) {
                        p = "" + t,
                        this.hasBeenReset = !0
                    }
                })),
                Object.defineProperty(s, "region", a({}, u, {
                    get: function() {
                        return g
                    },
                    set: function(t) {
                        g = t,
                        this.hasBeenReset = !0
                    }
                })),
                Object.defineProperty(s, "vertical", a({}, u, {
                    get: function() {
                        return v
                    },
                    set: function(t) {
                        var r = function(t) {
                            return "string" == typeof t && !!e[t.toLowerCase()] && t.toLowerCase()
                        }(t);
                        if (!1 === r)
                            throw new SyntaxError("An invalid or illegal string was specified.");
                        v = r,
                        this.hasBeenReset = !0
                    }
                })),
                Object.defineProperty(s, "snapToLines", a({}, u, {
                    get: function() {
                        return y
                    },
                    set: function(t) {
                        y = !!t,
                        this.hasBeenReset = !0
                    }
                })),
                Object.defineProperty(s, "line", a({}, u, {
                    get: function() {
                        return m
                    },
                    set: function(e) {
                        if ("number" != typeof e && e !== t)
                            throw new SyntaxError("An invalid number or illegal string was specified.");
                        m = e,
                        this.hasBeenReset = !0
                    }
                })),
                Object.defineProperty(s, "lineAlign", a({}, u, {
                    get: function() {
                        return _
                    },
                    set: function(t) {
                        var e = i(t);
                        if (!e)
                            throw new SyntaxError("An invalid or illegal string was specified.");
                        _ = e,
                        this.hasBeenReset = !0
                    }
                })),
                Object.defineProperty(s, "position", a({}, u, {
                    get: function() {
                        return E
                    },
                    set: function(t) {
                        if (t < 0 || t > 100)
                            throw new Error("Position must be between 0 and 100.");
                        E = t,
                        this.hasBeenReset = !0
                    }
                })),
                Object.defineProperty(s, "positionAlign", a({}, u, {
                    get: function() {
                        return T
                    },
                    set: function(t) {
                        var e = i(t);
                        if (!e)
                            throw new SyntaxError("An invalid or illegal string was specified.");
                        T = e,
                        this.hasBeenReset = !0
                    }
                })),
                Object.defineProperty(s, "size", a({}, u, {
                    get: function() {
                        return S
                    },
                    set: function(t) {
                        if (t < 0 || t > 100)
                            throw new Error("Size must be between 0 and 100.");
                        S = t,
                        this.hasBeenReset = !0
                    }
                })),
                Object.defineProperty(s, "align", a({}, u, {
                    get: function() {
                        return b
                    },
                    set: function(t) {
                        var e = i(t);
                        if (!e)
                            throw new SyntaxError("An invalid or illegal string was specified.");
                        b = e,
                        this.hasBeenReset = !0
                    }
                })),
                s.displayState = void 0,
                l)
                    return s
            }
            return n.prototype.getCueAsHTML = function() {
                return window.WebVTT.convertCueToDOMTree(window, this.text)
            }
            ,
            n
        }()
    }
    , function(t, e, r) {
        "use strict";
        var i = this && this.__extends || function() {
            var t = Object.setPrototypeOf || {
                __proto__: []
            }instanceof Array && function(t, e) {
                t.__proto__ = e
            }
            || function(t, e) {
                for (var r in e)
                    e.hasOwnProperty(r) && (t[r] = e[r])
            }
            ;
            return function(e, r) {
                function i() {
                    this.constructor = e
                }
                t(e, r),
                e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                new i)
            }
        }();
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var a = r(1)
          , n = r(4)
          , o = r(69)
          , s = r(70)
          , l = r(71)
          , u = r(0)
          , d = r(27);
        function c(t, e, r, i) {
            return Math.min(e, i) - Math.max(t, r)
        }
        var f = function(t) {
            function e(e) {
                var r = t.call(this, e, a.default.MEDIA_ATTACHING, a.default.MEDIA_DETACHING, a.default.FRAG_PARSING_USERDATA, a.default.FRAG_DECRYPTED, a.default.MANIFEST_LOADING, a.default.MANIFEST_LOADED, a.default.FRAG_LOADED, a.default.LEVEL_SWITCHING, a.default.INIT_PTS_FOUND) || this;
                if (r.hls = e,
                r.config = e.config,
                r.enabled = !0,
                r.Cues = e.config.cueHandler,
                r.textTracks = [],
                r.tracks = [],
                r.unparsedVttFrags = [],
                r.initPTS = void 0,
                r.cueRanges = [],
                r.captionsTracks = {},
                r.captionsProperties = {
                    textTrack1: {
                        label: r.config.captionsTextTrack1Label,
                        languageCode: r.config.captionsTextTrack1LanguageCode
                    },
                    textTrack2: {
                        label: r.config.captionsTextTrack2Label,
                        languageCode: r.config.captionsTextTrack2LanguageCode
                    }
                },
                r.config.enableCEA708Captions) {
                    var i = new s.default(r,"textTrack1")
                      , n = new s.default(r,"textTrack2");
                    r.cea608Parser = new o.default(0,i,n)
                }
                return r
            }
            return i(e, t),
            e.prototype.addCues = function(t, e, r, i) {
                for (var a = this.cueRanges, n = !1, o = a.length; o--; ) {
                    var s = a[o]
                      , l = c(s[0], s[1], e, r);
                    if (l >= 0 && (s[0] = Math.min(s[0], e),
                    s[1] = Math.max(s[1], r),
                    n = !0,
                    l / (r - e) > .5))
                        return
                }
                n || a.push([e, r]),
                this.Cues.newCue(this.captionsTracks[t], e, r, i)
            }
            ,
            e.prototype.onInitPtsFound = function(t) {
                var e = this;
                void 0 === this.initPTS && (this.initPTS = t.initPTS),
                this.unparsedVttFrags.length && (this.unparsedVttFrags.forEach(function(t) {
                    e.onFragLoaded(t)
                }),
                this.unparsedVttFrags = [])
            }
            ,
            e.prototype.getExistingTrack = function(t) {
                var e = this.media;
                if (e)
                    for (var r = 0; r < e.textTracks.length; r++) {
                        var i = e.textTracks[r];
                        if (i[t])
                            return i
                    }
                return null
            }
            ,
            e.prototype.createCaptionsTrack = function(t) {
                var e = this.captionsProperties[t]
                  , r = e.label
                  , i = e.languageCode
                  , a = this.captionsTracks;
                if (!a[t]) {
                    var n = this.getExistingTrack(t);
                    if (n)
                        a[t] = n,
                        d.clearCurrentCues(a[t]),
                        d.sendAddTrackEvent(a[t], this.media);
                    else {
                        var o = this.createTextTrack("captions", r, i);
                        o && (o[t] = !0,
                        a[t] = o)
                    }
                }
            }
            ,
            e.prototype.createTextTrack = function(t, e, r) {
                var i = this.media;
                if (i)
                    return i.addTextTrack(t, e, r)
            }
            ,
            e.prototype.destroy = function() {
                n.default.prototype.destroy.call(this)
            }
            ,
            e.prototype.onMediaAttaching = function(t) {
                this.media = t.media,
                this._cleanTracks()
            }
            ,
            e.prototype.onMediaDetaching = function() {
                var t = this.captionsTracks;
                Object.keys(t).forEach(function(e) {
                    d.clearCurrentCues(t[e]),
                    delete t[e]
                })
            }
            ,
            e.prototype.onManifestLoading = function() {
                this.lastSn = -1,
                this.prevCC = -1,
                this.vttCCs = {
                    ccOffset: 0,
                    presentationOffset: 0
                },
                this._cleanTracks()
            }
            ,
            e.prototype._cleanTracks = function() {
                var t = this.media;
                if (t) {
                    var e = t.textTracks;
                    if (e)
                        for (var r = 0; r < e.length; r++)
                            d.clearCurrentCues(e[r])
                }
            }
            ,
            e.prototype.onManifestLoaded = function(t) {
                var e = this;
                if (this.textTracks = [],
                this.unparsedVttFrags = this.unparsedVttFrags || [],
                this.initPTS = void 0,
                this.cueRanges = [],
                this.config.enableWebVTT) {
                    this.tracks = t.subtitles || [];
                    var r = this.media ? this.media.textTracks : [];
                    this.tracks.forEach(function(t, i) {
                        var a;
                        if (i < r.length) {
                            var n = Object.values(r).find(function(e) {
                                return function(t, e) {
                                    return t && t.label === e.name && !(t.textTrack1 || t.textTrack2)
                                }(e, t)
                            });
                            n && (a = n)
                        }
                        a || (a = e.createTextTrack("subtitles", t.name, t.lang)),
                        t.default ? a.mode = e.hls.subtitleDisplay ? "showing" : "hidden" : a.mode = "disabled",
                        e.textTracks.push(a)
                    })
                }
            }
            ,
            e.prototype.onLevelSwitching = function() {
                this.enabled = "NONE" !== this.hls.currentLevel.closedCaptions
            }
            ,
            e.prototype.onFragLoaded = function(t) {
                var e = t.frag
                  , r = t.payload;
                if ("main" === e.type) {
                    var i = e.sn;
                    if (i !== this.lastSn + 1) {
                        var n = this.cea608Parser;
                        n && n.reset()
                    }
                    this.lastSn = i
                } else if ("subtitle" === e.type)
                    if (r.byteLength) {
                        if (void 0 === this.initPTS)
                            return void this.unparsedVttFrags.push(t);
                        var o = e.decryptdata;
                        null != o && null != o.key && "AES-128" === o.method || this._parseVTTs(e, r)
                    } else
                        this.hls.trigger(a.default.SUBTITLE_FRAG_PROCESSED, {
                            success: !1,
                            frag: e
                        })
            }
            ,
            e.prototype._parseVTTs = function(t, e) {
                var r = this.vttCCs;
                r[t.cc] || (r[t.cc] = {
                    start: t.start,
                    prevCC: this.prevCC,
                    new: !0
                },
                this.prevCC = t.cc);
                var i = this.textTracks
                  , n = this.hls;
                l.default.parse(e, this.initPTS, r, t.cc, function(e) {
                    var r = i[t.trackId];
                    "disabled" !== r.mode ? (e.forEach(function(t) {
                        if (!r.cues.getCueById(t.id))
                            try {
                                r.addCue(t)
                            } catch (i) {
                                var e = new window.TextTrackCue(t.startTime,t.endTime,t.text);
                                e.id = t.id,
                                r.addCue(e)
                            }
                    }),
                    n.trigger(a.default.SUBTITLE_FRAG_PROCESSED, {
                        success: !0,
                        frag: t
                    })) : n.trigger(a.default.SUBTITLE_FRAG_PROCESSED, {
                        success: !1,
                        frag: t
                    })
                }, function(e) {
                    u.logger.log("Failed to parse VTT cue: " + e),
                    n.trigger(a.default.SUBTITLE_FRAG_PROCESSED, {
                        success: !1,
                        frag: t
                    })
                })
            }
            ,
            e.prototype.onFragDecrypted = function(t) {
                var e = t.payload
                  , r = t.frag;
                if ("subtitle" === r.type) {
                    if (void 0 === this.initPTS)
                        return void this.unparsedVttFrags.push(t);
                    this._parseVTTs(r, e)
                }
            }
            ,
            e.prototype.onFragParsingUserdata = function(t) {
                if (this.enabled && this.config.enableCEA708Captions)
                    for (var e = 0; e < t.samples.length; e++) {
                        var r = this.extractCea608Data(t.samples[e].bytes);
                        this.cea608Parser.addData(t.samples[e].pts, r)
                    }
            }
            ,
            e.prototype.extractCea608Data = function(t) {
                for (var e, r, i, a = 31 & t[0], n = 2, o = [], s = 0; s < a; s++)
                    e = t[n++],
                    r = 127 & t[n++],
                    i = 127 & t[n++],
                    0 === r && 0 === i || 0 != (4 & e) && 0 === (3 & e) && (o.push(r),
                    o.push(i));
                return o
            }
            ,
            e
        }(n.default);
        e.default = f
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = {
            42: 225,
            92: 233,
            94: 237,
            95: 243,
            96: 250,
            123: 231,
            124: 247,
            125: 209,
            126: 241,
            127: 9608,
            128: 174,
            129: 176,
            130: 189,
            131: 191,
            132: 8482,
            133: 162,
            134: 163,
            135: 9834,
            136: 224,
            137: 32,
            138: 232,
            139: 226,
            140: 234,
            141: 238,
            142: 244,
            143: 251,
            144: 193,
            145: 201,
            146: 211,
            147: 218,
            148: 220,
            149: 252,
            150: 8216,
            151: 161,
            152: 42,
            153: 8217,
            154: 9473,
            155: 169,
            156: 8480,
            157: 8226,
            158: 8220,
            159: 8221,
            160: 192,
            161: 194,
            162: 199,
            163: 200,
            164: 202,
            165: 203,
            166: 235,
            167: 206,
            168: 207,
            169: 239,
            170: 212,
            171: 217,
            172: 249,
            173: 219,
            174: 171,
            175: 187,
            176: 195,
            177: 227,
            178: 205,
            179: 204,
            180: 236,
            181: 210,
            182: 242,
            183: 213,
            184: 245,
            185: 123,
            186: 125,
            187: 92,
            188: 94,
            189: 95,
            190: 124,
            191: 8764,
            192: 196,
            193: 228,
            194: 214,
            195: 246,
            196: 223,
            197: 165,
            198: 164,
            199: 9475,
            200: 197,
            201: 229,
            202: 216,
            203: 248,
            204: 9487,
            205: 9491,
            206: 9495,
            207: 9499
        }
          , a = function(t) {
            var e = t;
            return i.hasOwnProperty(t) && (e = i[t]),
            String.fromCharCode(e)
        }
          , n = 15
          , o = 100
          , s = {
            17: 1,
            18: 3,
            21: 5,
            22: 7,
            23: 9,
            16: 11,
            19: 12,
            20: 14
        }
          , l = {
            17: 2,
            18: 4,
            21: 6,
            22: 8,
            23: 10,
            19: 13,
            20: 15
        }
          , u = {
            25: 1,
            26: 3,
            29: 5,
            30: 7,
            31: 9,
            24: 11,
            27: 12,
            28: 14
        }
          , d = {
            25: 2,
            26: 4,
            29: 6,
            30: 8,
            31: 10,
            27: 13,
            28: 15
        }
          , c = ["white", "green", "blue", "cyan", "red", "yellow", "magenta", "black", "transparent"]
          , f = {
            verboseFilter: {
                DATA: 3,
                DEBUG: 3,
                INFO: 2,
                WARNING: 2,
                TEXT: 1,
                ERROR: 0
            },
            time: null,
            verboseLevel: 0,
            setTime: function(t) {
                this.time = t
            },
            log: function(t, e) {
                this.verboseFilter[t];
                this.verboseLevel
            }
        }
          , h = function(t) {
            for (var e = [], r = 0; r < t.length; r++)
                e.push(t[r].toString(16));
            return e
        }
          , p = function() {
            function t(t, e, r, i, a) {
                this.foreground = t || "white",
                this.underline = e || !1,
                this.italics = r || !1,
                this.background = i || "black",
                this.flash = a || !1
            }
            return t.prototype.reset = function() {
                this.foreground = "white",
                this.underline = !1,
                this.italics = !1,
                this.background = "black",
                this.flash = !1
            }
            ,
            t.prototype.setStyles = function(t) {
                for (var e = ["foreground", "underline", "italics", "background", "flash"], r = 0; r < e.length; r++) {
                    var i = e[r];
                    t.hasOwnProperty(i) && (this[i] = t[i])
                }
            }
            ,
            t.prototype.isDefault = function() {
                return "white" === this.foreground && !this.underline && !this.italics && "black" === this.background && !this.flash
            }
            ,
            t.prototype.equals = function(t) {
                return this.foreground === t.foreground && this.underline === t.underline && this.italics === t.italics && this.background === t.background && this.flash === t.flash
            }
            ,
            t.prototype.copy = function(t) {
                this.foreground = t.foreground,
                this.underline = t.underline,
                this.italics = t.italics,
                this.background = t.background,
                this.flash = t.flash
            }
            ,
            t.prototype.toString = function() {
                return "color=" + this.foreground + ", underline=" + this.underline + ", italics=" + this.italics + ", background=" + this.background + ", flash=" + this.flash
            }
            ,
            t
        }()
          , g = function() {
            function t(t, e, r, i, a, n) {
                this.uchar = t || " ",
                this.penState = new p(e,r,i,a,n)
            }
            return t.prototype.reset = function() {
                this.uchar = " ",
                this.penState.reset()
            }
            ,
            t.prototype.setChar = function(t, e) {
                this.uchar = t,
                this.penState.copy(e)
            }
            ,
            t.prototype.setPenState = function(t) {
                this.penState.copy(t)
            }
            ,
            t.prototype.equals = function(t) {
                return this.uchar === t.uchar && this.penState.equals(t.penState)
            }
            ,
            t.prototype.copy = function(t) {
                this.uchar = t.uchar,
                this.penState.copy(t.penState)
            }
            ,
            t.prototype.isEmpty = function() {
                return " " === this.uchar && this.penState.isDefault()
            }
            ,
            t
        }()
          , v = function() {
            function t() {
                this.chars = [];
                for (var t = 0; t < o; t++)
                    this.chars.push(new g);
                this.pos = 0,
                this.currPenState = new p
            }
            return t.prototype.equals = function(t) {
                for (var e = !0, r = 0; r < o; r++)
                    if (!this.chars[r].equals(t.chars[r])) {
                        e = !1;
                        break
                    }
                return e
            }
            ,
            t.prototype.copy = function(t) {
                for (var e = 0; e < o; e++)
                    this.chars[e].copy(t.chars[e])
            }
            ,
            t.prototype.isEmpty = function() {
                for (var t = !0, e = 0; e < o; e++)
                    if (!this.chars[e].isEmpty()) {
                        t = !1;
                        break
                    }
                return t
            }
            ,
            t.prototype.setCursor = function(t) {
                this.pos !== t && (this.pos = t),
                this.pos < 0 ? (f.log("ERROR", "Negative cursor position " + this.pos),
                this.pos = 0) : this.pos > o && (f.log("ERROR", "Too large cursor position " + this.pos),
                this.pos = o)
            }
            ,
            t.prototype.moveCursor = function(t) {
                var e = this.pos + t;
                if (t > 1)
                    for (var r = this.pos + 1; r < e + 1; r++)
                        this.chars[r].setPenState(this.currPenState);
                this.setCursor(e)
            }
            ,
            t.prototype.backSpace = function() {
                this.moveCursor(-1),
                this.chars[this.pos].setChar(" ", this.currPenState)
            }
            ,
            t.prototype.insertChar = function(t) {
                t >= 144 && this.backSpace();
                var e = a(t);
                this.pos >= o ? f.log("ERROR", "Cannot insert " + t.toString(16) + " (" + e + ") at position " + this.pos + ". Skipping it!") : (this.chars[this.pos].setChar(e, this.currPenState),
                this.moveCursor(1))
            }
            ,
            t.prototype.clearFromPos = function(t) {
                var e;
                for (e = t; e < o; e++)
                    this.chars[e].reset()
            }
            ,
            t.prototype.clear = function() {
                this.clearFromPos(0),
                this.pos = 0,
                this.currPenState.reset()
            }
            ,
            t.prototype.clearToEndOfRow = function() {
                this.clearFromPos(this.pos)
            }
            ,
            t.prototype.getTextString = function() {
                for (var t = [], e = !0, r = 0; r < o; r++) {
                    var i = this.chars[r].uchar;
                    " " !== i && (e = !1),
                    t.push(i)
                }
                return e ? "" : t.join("")
            }
            ,
            t.prototype.setPenStyles = function(t) {
                this.currPenState.setStyles(t),
                this.chars[this.pos].setPenState(this.currPenState)
            }
            ,
            t
        }()
          , y = function() {
            function t() {
                this.rows = [];
                for (var t = 0; t < n; t++)
                    this.rows.push(new v);
                this.currRow = n - 1,
                this.nrRollUpRows = null,
                this.reset()
            }
            return t.prototype.reset = function() {
                for (var t = 0; t < n; t++)
                    this.rows[t].clear();
                this.currRow = n - 1
            }
            ,
            t.prototype.equals = function(t) {
                for (var e = !0, r = 0; r < n; r++)
                    if (!this.rows[r].equals(t.rows[r])) {
                        e = !1;
                        break
                    }
                return e
            }
            ,
            t.prototype.copy = function(t) {
                for (var e = 0; e < n; e++)
                    this.rows[e].copy(t.rows[e])
            }
            ,
            t.prototype.isEmpty = function() {
                for (var t = !0, e = 0; e < n; e++)
                    if (!this.rows[e].isEmpty()) {
                        t = !1;
                        break
                    }
                return t
            }
            ,
            t.prototype.backSpace = function() {
                this.rows[this.currRow].backSpace()
            }
            ,
            t.prototype.clearToEndOfRow = function() {
                this.rows[this.currRow].clearToEndOfRow()
            }
            ,
            t.prototype.insertChar = function(t) {
                this.rows[this.currRow].insertChar(t)
            }
            ,
            t.prototype.setPen = function(t) {
                this.rows[this.currRow].setPenStyles(t)
            }
            ,
            t.prototype.moveCursor = function(t) {
                this.rows[this.currRow].moveCursor(t)
            }
            ,
            t.prototype.setCursor = function(t) {
                f.log("INFO", "setCursor: " + t),
                this.rows[this.currRow].setCursor(t)
            }
            ,
            t.prototype.setPAC = function(t) {
                f.log("INFO", "pacData = " + JSON.stringify(t));
                var e = t.row - 1;
                if (this.nrRollUpRows && e < this.nrRollUpRows - 1 && (e = this.nrRollUpRows - 1),
                this.nrRollUpRows && this.currRow !== e) {
                    for (var r = 0; r < n; r++)
                        this.rows[r].clear();
                    var i = this.currRow + 1 - this.nrRollUpRows
                      , a = this.lastOutputScreen;
                    if (a) {
                        var o = a.rows[i].cueStartTime;
                        if (o && o < f.time)
                            for (r = 0; r < this.nrRollUpRows; r++)
                                this.rows[e - this.nrRollUpRows + r + 1].copy(a.rows[i + r])
                    }
                }
                this.currRow = e;
                var s = this.rows[this.currRow];
                if (null !== t.indent) {
                    var l = t.indent
                      , u = Math.max(l - 1, 0);
                    s.setCursor(t.indent),
                    t.color = s.chars[u].penState.foreground
                }
                var d = {
                    foreground: t.color,
                    underline: t.underline,
                    italics: t.italics,
                    background: "black",
                    flash: !1
                };
                this.setPen(d)
            }
            ,
            t.prototype.setBkgData = function(t) {
                f.log("INFO", "bkgData = " + JSON.stringify(t)),
                this.backSpace(),
                this.setPen(t),
                this.insertChar(32)
            }
            ,
            t.prototype.setRollUpRows = function(t) {
                this.nrRollUpRows = t
            }
            ,
            t.prototype.rollUp = function() {
                if (null !== this.nrRollUpRows) {
                    f.log("TEXT", this.getDisplayText());
                    var t = this.currRow + 1 - this.nrRollUpRows
                      , e = this.rows.splice(t, 1)[0];
                    e.clear(),
                    this.rows.splice(this.currRow, 0, e),
                    f.log("INFO", "Rolling up")
                } else
                    f.log("DEBUG", "roll_up but nrRollUpRows not set yet")
            }
            ,
            t.prototype.getDisplayText = function(t) {
                t = t || !1;
                for (var e = [], r = "", i = -1, a = 0; a < n; a++) {
                    var o = this.rows[a].getTextString();
                    o && (i = a + 1,
                    t ? e.push("Row " + i + ": '" + o + "'") : e.push(o.trim()))
                }
                return e.length > 0 && (r = t ? "[" + e.join(" | ") + "]" : e.join("\n")),
                r
            }
            ,
            t.prototype.getTextAndFormat = function() {
                return this.rows
            }
            ,
            t
        }()
          , m = function() {
            function t(t, e) {
                this.chNr = t,
                this.outputFilter = e,
                this.mode = null,
                this.verbose = 0,
                this.displayedMemory = new y,
                this.nonDisplayedMemory = new y,
                this.lastOutputScreen = new y,
                this.currRollUpRow = this.displayedMemory.rows[n - 1],
                this.writeScreen = this.displayedMemory,
                this.mode = null,
                this.cueStartTime = null
            }
            return t.prototype.reset = function() {
                this.mode = null,
                this.displayedMemory.reset(),
                this.nonDisplayedMemory.reset(),
                this.lastOutputScreen.reset(),
                this.currRollUpRow = this.displayedMemory.rows[n - 1],
                this.writeScreen = this.displayedMemory,
                this.mode = null,
                this.cueStartTime = null,
                this.lastCueEndTime = null
            }
            ,
            t.prototype.getHandler = function() {
                return this.outputFilter
            }
            ,
            t.prototype.setHandler = function(t) {
                this.outputFilter = t
            }
            ,
            t.prototype.setPAC = function(t) {
                this.writeScreen.setPAC(t)
            }
            ,
            t.prototype.setBkgData = function(t) {
                this.writeScreen.setBkgData(t)
            }
            ,
            t.prototype.setMode = function(t) {
                t !== this.mode && (this.mode = t,
                f.log("INFO", "MODE=" + t),
                "MODE_POP-ON" === this.mode ? this.writeScreen = this.nonDisplayedMemory : (this.writeScreen = this.displayedMemory,
                this.writeScreen.reset()),
                "MODE_ROLL-UP" !== this.mode && (this.displayedMemory.nrRollUpRows = null,
                this.nonDisplayedMemory.nrRollUpRows = null),
                this.mode = t)
            }
            ,
            t.prototype.insertChars = function(t) {
                for (var e = 0; e < t.length; e++)
                    this.writeScreen.insertChar(t[e]);
                var r = this.writeScreen === this.displayedMemory ? "DISP" : "NON_DISP";
                f.log("INFO", r + ": " + this.writeScreen.getDisplayText(!0)),
                "MODE_PAINT-ON" !== this.mode && "MODE_ROLL-UP" !== this.mode || (f.log("TEXT", "DISPLAYED: " + this.displayedMemory.getDisplayText(!0)),
                this.outputDataUpdate())
            }
            ,
            t.prototype.ccRCL = function() {
                f.log("INFO", "RCL - Resume Caption Loading"),
                this.setMode("MODE_POP-ON")
            }
            ,
            t.prototype.ccBS = function() {
                f.log("INFO", "BS - BackSpace"),
                "MODE_TEXT" !== this.mode && (this.writeScreen.backSpace(),
                this.writeScreen === this.displayedMemory && this.outputDataUpdate())
            }
            ,
            t.prototype.ccAOF = function() {}
            ,
            t.prototype.ccAON = function() {}
            ,
            t.prototype.ccDER = function() {
                f.log("INFO", "DER- Delete to End of Row"),
                this.writeScreen.clearToEndOfRow(),
                this.outputDataUpdate()
            }
            ,
            t.prototype.ccRU = function(t) {
                f.log("INFO", "RU(" + t + ") - Roll Up"),
                this.writeScreen = this.displayedMemory,
                this.setMode("MODE_ROLL-UP"),
                this.writeScreen.setRollUpRows(t)
            }
            ,
            t.prototype.ccFON = function() {
                f.log("INFO", "FON - Flash On"),
                this.writeScreen.setPen({
                    flash: !0
                })
            }
            ,
            t.prototype.ccRDC = function() {
                f.log("INFO", "RDC - Resume Direct Captioning"),
                this.setMode("MODE_PAINT-ON")
            }
            ,
            t.prototype.ccTR = function() {
                f.log("INFO", "TR"),
                this.setMode("MODE_TEXT")
            }
            ,
            t.prototype.ccRTD = function() {
                f.log("INFO", "RTD"),
                this.setMode("MODE_TEXT")
            }
            ,
            t.prototype.ccEDM = function() {
                f.log("INFO", "EDM - Erase Displayed Memory"),
                this.displayedMemory.reset(),
                this.outputDataUpdate(!0)
            }
            ,
            t.prototype.ccCR = function() {
                f.log("CR - Carriage Return"),
                this.writeScreen.rollUp(),
                this.outputDataUpdate(!0)
            }
            ,
            t.prototype.ccENM = function() {
                f.log("INFO", "ENM - Erase Non-displayed Memory"),
                this.nonDisplayedMemory.reset()
            }
            ,
            t.prototype.ccEOC = function() {
                if (f.log("INFO", "EOC - End Of Caption"),
                "MODE_POP-ON" === this.mode) {
                    var t = this.displayedMemory;
                    this.displayedMemory = this.nonDisplayedMemory,
                    this.nonDisplayedMemory = t,
                    this.writeScreen = this.nonDisplayedMemory,
                    f.log("TEXT", "DISP: " + this.displayedMemory.getDisplayText())
                }
                this.outputDataUpdate(!0)
            }
            ,
            t.prototype.ccTO = function(t) {
                f.log("INFO", "TO(" + t + ") - Tab Offset"),
                this.writeScreen.moveCursor(t)
            }
            ,
            t.prototype.ccMIDROW = function(t) {
                var e = {
                    flash: !1
                };
                if (e.underline = t % 2 == 1,
                e.italics = t >= 46,
                e.italics)
                    e.foreground = "white";
                else {
                    var r = Math.floor(t / 2) - 16;
                    e.foreground = ["white", "green", "blue", "cyan", "red", "yellow", "magenta"][r]
                }
                f.log("INFO", "MIDROW: " + JSON.stringify(e)),
                this.writeScreen.setPen(e)
            }
            ,
            t.prototype.outputDataUpdate = function(t) {
                void 0 === t && (t = !1);
                var e = f.time;
                null !== e && this.outputFilter && (null !== this.cueStartTime || this.displayedMemory.isEmpty() ? this.displayedMemory.equals(this.lastOutputScreen) || (this.outputFilter.newCue && (this.outputFilter.newCue(this.cueStartTime, e, this.lastOutputScreen),
                !0 === t && this.outputFilter.dispatchCue && this.outputFilter.dispatchCue()),
                this.cueStartTime = this.displayedMemory.isEmpty() ? null : e) : this.cueStartTime = e,
                this.lastOutputScreen.copy(this.displayedMemory))
            }
            ,
            t.prototype.cueSplitAtTime = function(t) {
                this.outputFilter && (this.displayedMemory.isEmpty() || (this.outputFilter.newCue && this.outputFilter.newCue(this.cueStartTime, t, this.displayedMemory),
                this.cueStartTime = t))
            }
            ,
            t
        }()
          , _ = function() {
            function t(t, e, r) {
                this.field = t || 1,
                this.outputs = [e, r],
                this.channels = [new m(1,e), new m(2,r)],
                this.currChNr = -1,
                this.lastCmdA = null,
                this.lastCmdB = null,
                this.bufferedData = [],
                this.startTime = null,
                this.lastTime = null,
                this.dataCounters = {
                    padding: 0,
                    char: 0,
                    cmd: 0,
                    other: 0
                }
            }
            return t.prototype.getHandler = function(t) {
                return this.channels[t].getHandler()
            }
            ,
            t.prototype.setHandler = function(t, e) {
                this.channels[t].setHandler(e)
            }
            ,
            t.prototype.addData = function(t, e) {
                var r, i, a, n = !1;
                this.lastTime = t,
                f.setTime(t);
                for (var o = 0; o < e.length; o += 2)
                    if (i = 127 & e[o],
                    a = 127 & e[o + 1],
                    0 !== i || 0 !== a) {
                        if (f.log("DATA", "[" + h([e[o], e[o + 1]]) + "] -> (" + h([i, a]) + ")"),
                        (r = this.parseCmd(i, a)) || (r = this.parseMidrow(i, a)),
                        r || (r = this.parsePAC(i, a)),
                        r || (r = this.parseBackgroundAttributes(i, a)),
                        !r)
                            if (n = this.parseChars(i, a))
                                if (this.currChNr && this.currChNr >= 0)
                                    this.channels[this.currChNr - 1].insertChars(n);
                                else
                                    f.log("WARNING", "No channel found yet. TEXT-MODE?");
                        r ? this.dataCounters.cmd += 2 : n ? this.dataCounters.char += 2 : (this.dataCounters.other += 2,
                        f.log("WARNING", "Couldn't parse cleaned data " + h([i, a]) + " orig: " + h([e[o], e[o + 1]])))
                    } else
                        this.dataCounters.padding += 2
            }
            ,
            t.prototype.parseCmd = function(t, e) {
                var r = null;
                if (!((20 === t || 28 === t) && e >= 32 && e <= 47) && !((23 === t || 31 === t) && e >= 33 && e <= 35))
                    return !1;
                if (t === this.lastCmdA && e === this.lastCmdB)
                    return this.lastCmdA = null,
                    this.lastCmdB = null,
                    f.log("DEBUG", "Repeated command (" + h([t, e]) + ") is dropped"),
                    !0;
                r = 20 === t || 23 === t ? 1 : 2;
                var i = this.channels[r - 1];
                return 20 === t || 28 === t ? 32 === e ? i.ccRCL() : 33 === e ? i.ccBS() : 34 === e ? i.ccAOF() : 35 === e ? i.ccAON() : 36 === e ? i.ccDER() : 37 === e ? i.ccRU(2) : 38 === e ? i.ccRU(3) : 39 === e ? i.ccRU(4) : 40 === e ? i.ccFON() : 41 === e ? i.ccRDC() : 42 === e ? i.ccTR() : 43 === e ? i.ccRTD() : 44 === e ? i.ccEDM() : 45 === e ? i.ccCR() : 46 === e ? i.ccENM() : 47 === e && i.ccEOC() : i.ccTO(e - 32),
                this.lastCmdA = t,
                this.lastCmdB = e,
                this.currChNr = r,
                !0
            }
            ,
            t.prototype.parseMidrow = function(t, e) {
                var r = null;
                return (17 === t || 25 === t) && e >= 32 && e <= 47 && ((r = 17 === t ? 1 : 2) !== this.currChNr ? (f.log("ERROR", "Mismatch channel in midrow parsing"),
                !1) : (this.channels[r - 1].ccMIDROW(e),
                f.log("DEBUG", "MIDROW (" + h([t, e]) + ")"),
                !0))
            }
            ,
            t.prototype.parsePAC = function(t, e) {
                var r, i = null;
                if (!((t >= 17 && t <= 23 || t >= 25 && t <= 31) && e >= 64 && e <= 127) && !((16 === t || 24 === t) && e >= 64 && e <= 95))
                    return !1;
                if (t === this.lastCmdA && e === this.lastCmdB)
                    return this.lastCmdA = null,
                    this.lastCmdB = null,
                    !0;
                r = t <= 23 ? 1 : 2,
                i = e >= 64 && e <= 95 ? 1 === r ? s[t] : u[t] : 1 === r ? l[t] : d[t];
                var a = this.interpretPAC(i, e);
                return this.channels[r - 1].setPAC(a),
                this.lastCmdA = t,
                this.lastCmdB = e,
                this.currChNr = r,
                !0
            }
            ,
            t.prototype.interpretPAC = function(t, e) {
                var r = e
                  , i = {
                    color: null,
                    italics: !1,
                    indent: null,
                    underline: !1,
                    row: t
                };
                return r = e > 95 ? e - 96 : e - 64,
                i.underline = 1 == (1 & r),
                r <= 13 ? i.color = ["white", "green", "blue", "cyan", "red", "yellow", "magenta", "white"][Math.floor(r / 2)] : r <= 15 ? (i.italics = !0,
                i.color = "white") : i.indent = 4 * Math.floor((r - 16) / 2),
                i
            }
            ,
            t.prototype.parseChars = function(t, e) {
                var r = null
                  , i = null
                  , n = null;
                if (t >= 25 ? (r = 2,
                n = t - 8) : (r = 1,
                n = t),
                n >= 17 && n <= 19) {
                    var o = e;
                    o = 17 === n ? e + 80 : 18 === n ? e + 112 : e + 144,
                    f.log("INFO", "Special char '" + a(o) + "' in channel " + r),
                    i = [o]
                } else
                    t >= 32 && t <= 127 && (i = 0 === e ? [t] : [t, e]);
                if (i) {
                    var s = h(i);
                    f.log("DEBUG", "Char codes =  " + s.join(",")),
                    this.lastCmdA = null,
                    this.lastCmdB = null
                }
                return i
            }
            ,
            t.prototype.parseBackgroundAttributes = function(t, e) {
                var r, i, a;
                return ((16 === t || 24 === t) && e >= 32 && e <= 47 || (23 === t || 31 === t) && e >= 45 && e <= 47) && (r = {},
                16 === t || 24 === t ? (i = Math.floor((e - 32) / 2),
                r.background = c[i],
                e % 2 == 1 && (r.background = r.background + "_semi")) : 45 === e ? r.background = "transparent" : (r.foreground = "black",
                47 === e && (r.underline = !0)),
                a = t < 24 ? 1 : 2,
                this.channels[a - 1].setBkgData(r),
                this.lastCmdA = null,
                this.lastCmdB = null,
                !0)
            }
            ,
            t.prototype.reset = function() {
                for (var t = 0; t < this.channels.length; t++)
                    this.channels[t] && this.channels[t].reset();
                this.lastCmdA = null,
                this.lastCmdB = null
            }
            ,
            t.prototype.cueSplitAtTime = function(t) {
                for (var e = 0; e < this.channels.length; e++)
                    this.channels[e] && this.channels[e].cueSplitAtTime(t)
            }
            ,
            t
        }();
        e.default = _
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = function() {
            function t(t, e) {
                this.timelineController = t,
                this.trackName = e,
                this.startTime = null,
                this.endTime = null,
                this.screen = null
            }
            return t.prototype.dispatchCue = function() {
                null !== this.startTime && (this.timelineController.addCues(this.trackName, this.startTime, this.endTime, this.screen),
                this.startTime = null)
            }
            ,
            t.prototype.newCue = function(t, e, r) {
                (null === this.startTime || this.startTime > t) && (this.startTime = t),
                this.endTime = e,
                this.screen = r,
                this.timelineController.createCaptionsTrack(this.trackName)
            }
            ,
            t
        }();
        e.default = i
    }
    , function(t, e, r) {
        "use strict";
        (function(t) {
            Object.defineProperty(e, "__esModule", {
                value: !0
            });
            var i = r(28)
              , a = r(9)
              , n = function(t, e, r) {
                return t.substr(r || 0, e.length) === e
            }
              , o = function(t) {
                for (var e = 5381, r = t.length; r; )
                    e = 33 * e ^ t.charCodeAt(--r);
                return (e >>> 0).toString()
            }
              , s = {
                parse: function(e, r, s, l, u, d) {
                    var c, f = a.utf8ArrayToStr(new Uint8Array(e)).trim().replace(/\r\n|\n\r|\n|\r/g, "\n").split("\n"), h = "00:00.000", p = 0, g = 0, v = 0, y = [], m = !0, _ = new i.default;
                    _.oncue = function(t) {
                        var e = s[l]
                          , r = s.ccOffset;
                        e && e.new && (void 0 !== g ? r = s.ccOffset = e.start : function(t, e, r) {
                            var i = t[e]
                              , a = t[i.prevCC];
                            if (!a || !a.new && i.new)
                                return t.ccOffset = t.presentationOffset = i.start,
                                void (i.new = !1);
                            for (; a && a.new; )
                                t.ccOffset += i.start - a.start,
                                i.new = !1,
                                a = t[(i = a).prevCC];
                            t.presentationOffset = r
                        }(s, l, v)),
                        v && (r = v + s.ccOffset - s.presentationOffset),
                        t.startTime += r - g,
                        t.endTime += r - g,
                        t.id = o(t.startTime.toString()) + o(t.endTime.toString()) + o(t.text),
                        t.text = decodeURIComponent(encodeURIComponent(t.text)),
                        t.endTime > 0 && y.push(t)
                    }
                    ,
                    _.onparsingerror = function(t) {
                        c = t
                    }
                    ,
                    _.onflush = function() {
                        c && d ? d(c) : u(y)
                    }
                    ,
                    f.forEach(function(e) {
                        if (m) {
                            if (n(e, "X-TIMESTAMP-MAP=")) {
                                m = !1,
                                e.substr(16).split(",").forEach(function(t) {
                                    n(t, "LOCAL:") ? h = t.substr(6) : n(t, "MPEGTS:") && (p = parseInt(t.substr(7)))
                                });
                                try {
                                    p -= r = r < 0 ? r + 8589934592 : r,
                                    g = function(e) {
                                        var r = parseInt(e.substr(-3))
                                          , i = parseInt(e.substr(-6, 2))
                                          , a = parseInt(e.substr(-9, 2))
                                          , n = e.length > 9 ? parseInt(e.substr(0, e.indexOf(":"))) : 0;
                                        return t.isFinite(r) && t.isFinite(i) && t.isFinite(a) && t.isFinite(n) ? (r += 1e3 * i,
                                        r += 6e4 * a,
                                        r += 36e5 * n) : -1
                                    }(h) / 1e3,
                                    v = p / 9e4,
                                    -1 === g && (c = new Error("Malformed X-TIMESTAMP-MAP: " + e))
                                } catch (t) {
                                    c = new Error("Malformed X-TIMESTAMP-MAP: " + e)
                                }
                                return
                            }
                            "" === e && (m = !1)
                        }
                        _.parse(e + "\n")
                    }),
                    _.flush()
                }
            };
            e.default = s
        }
        ).call(this, r(3).Number)
    }
    , function(t, e, r) {
        "use strict";
        var i = this && this.__extends || function() {
            var t = Object.setPrototypeOf || {
                __proto__: []
            }instanceof Array && function(t, e) {
                t.__proto__ = e
            }
            || function(t, e) {
                for (var r in e)
                    e.hasOwnProperty(r) && (t[r] = e[r])
            }
            ;
            return function(e, r) {
                function i() {
                    this.constructor = e
                }
                t(e, r),
                e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                new i)
            }
        }();
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var a = r(1)
          , n = r(4)
          , o = r(0);
        function s(t) {
            for (var e = [], r = 0; r < t.length; r++)
                "subtitles" === t[r].kind && e.push(t[r]);
            return e
        }
        var l = function(t) {
            function e(e) {
                var r = t.call(this, e, a.default.MEDIA_ATTACHED, a.default.MEDIA_DETACHING, a.default.MANIFEST_LOADING, a.default.MANIFEST_LOADED, a.default.SUBTITLE_TRACK_LOADED) || this;
                return r.tracks = [],
                r.trackId = -1,
                r.media = null,
                r.subtitleDisplay = !0,
                r
            }
            return i(e, t),
            e.prototype._onTextTracksChanged = function() {
                if (this.media) {
                    for (var t = -1, e = s(this.media.textTracks), r = 0; r < e.length; r++)
                        if ("hidden" === e[r].mode)
                            t = r;
                        else if ("showing" === e[r].mode) {
                            t = r;
                            break
                        }
                    this.subtitleTrack = t
                }
            }
            ,
            e.prototype.destroy = function() {
                n.default.prototype.destroy.call(this)
            }
            ,
            e.prototype.onMediaAttached = function(t) {
                var e = this;
                this.media = t.media,
                this.media && (this.queuedDefaultTrack && (this.subtitleTrack = this.queuedDefaultTrack,
                delete this.queuedDefaultTrack),
                this.trackChangeListener = this._onTextTracksChanged.bind(this),
                this.useTextTrackPolling = !(this.media.textTracks && "onchange"in this.media.textTracks),
                this.useTextTrackPolling ? this.subtitlePollingInterval = setInterval(function() {
                    e.trackChangeListener()
                }, 500) : this.media.textTracks.addEventListener("change", this.trackChangeListener))
            }
            ,
            e.prototype.onMediaDetaching = function() {
                this.media && (this.useTextTrackPolling ? clearInterval(this.subtitlePollingInterval) : this.media.textTracks.removeEventListener("change", this.trackChangeListener),
                this.media = null)
            }
            ,
            e.prototype.onManifestLoading = function() {
                this.tracks = [],
                this.trackId = -1
            }
            ,
            e.prototype.onManifestLoaded = function(t) {
                var e = this
                  , r = t.subtitles || [];
                this.tracks = r,
                this.trackId = -1,
                this.hls.trigger(a.default.SUBTITLE_TRACKS_UPDATED, {
                    subtitleTracks: r
                }),
                r.forEach(function(t) {
                    t.default && (e.media ? e.subtitleTrack = t.id : e.queuedDefaultTrack = t.id)
                })
            }
            ,
            e.prototype.onTick = function() {
                var t = this.trackId
                  , e = this.tracks[t];
                if (e) {
                    var r = e.details;
                    r && !r.live || (o.logger.log("(re)loading playlist for subtitle track " + t),
                    this.hls.trigger(a.default.SUBTITLE_TRACK_LOADING, {
                        url: e.url,
                        id: t
                    }))
                }
            }
            ,
            e.prototype.onSubtitleTrackLoaded = function(t) {
                var e = this;
                t.id < this.tracks.length && (o.logger.log("subtitle track " + t.id + " loaded"),
                this.tracks[t.id].details = t.details,
                t.details.live && !this.timer && (this.timer = setInterval(function() {
                    e.onTick()
                }, 1e3 * t.details.targetduration, this)),
                !t.details.live && this.timer && this._stopTimer())
            }
            ,
            Object.defineProperty(e.prototype, "subtitleTracks", {
                get: function() {
                    return this.tracks
                },
                enumerable: !0,
                configurable: !0
            }),
            Object.defineProperty(e.prototype, "subtitleTrack", {
                get: function() {
                    return this.trackId
                },
                set: function(t) {
                    this.trackId !== t && (this._toggleTrackModes(t),
                    this.setSubtitleTrackInternal(t))
                },
                enumerable: !0,
                configurable: !0
            }),
            e.prototype.setSubtitleTrackInternal = function(t) {
                var e = this.hls
                  , r = this.tracks;
                if (!("number" != typeof t || t < -1 || t >= r.length) && (this._stopTimer(),
                this.trackId = t,
                o.logger.log("switching to subtitle track " + t),
                e.trigger(a.default.SUBTITLE_TRACK_SWITCH, {
                    id: t
                }),
                -1 !== t)) {
                    var i = r[t]
                      , n = i.details;
                    n && !n.live || (o.logger.log("(re)loading playlist for subtitle track " + t),
                    e.trigger(a.default.SUBTITLE_TRACK_LOADING, {
                        url: i.url,
                        id: t
                    }))
                }
            }
            ,
            e.prototype._stopTimer = function() {
                this.timer && (clearInterval(this.timer),
                this.timer = null)
            }
            ,
            e.prototype._toggleTrackModes = function(t) {
                var e = this.media
                  , r = this.subtitleDisplay
                  , i = this.trackId;
                if (e) {
                    var a = s(e.textTracks);
                    if (-1 === t)
                        [].slice.call(a).forEach(function(t) {
                            t.mode = "disabled"
                        });
                    else {
                        var n = a[i];
                        n && (n.mode = "disabled")
                    }
                    var o = a[t];
                    o && (o.mode = r ? "showing" : "hidden")
                }
            }
            ,
            e
        }(n.default);
        e.default = l
    }
    , function(t, e, r) {
        "use strict";
        var i = this && this.__extends || function() {
            var t = Object.setPrototypeOf || {
                __proto__: []
            }instanceof Array && function(t, e) {
                t.__proto__ = e
            }
            || function(t, e) {
                for (var r in e)
                    e.hasOwnProperty(r) && (t[r] = e[r])
            }
            ;
            return function(e, r) {
                function i() {
                    this.constructor = e
                }
                t(e, r),
                e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                new i)
            }
        }();
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var a = r(1)
          , n = r(0)
          , o = r(13)
          , s = r(10)
          , l = window.performance
          , u = {
            STOPPED: "STOPPED",
            IDLE: "IDLE",
            KEY_LOADING: "KEY_LOADING",
            FRAG_LOADING: "FRAG_LOADING"
        }
          , d = function(t) {
            function e(e) {
                var r = t.call(this, e, a.default.MEDIA_ATTACHED, a.default.ERROR, a.default.KEY_LOADED, a.default.FRAG_LOADED, a.default.SUBTITLE_TRACKS_UPDATED, a.default.SUBTITLE_TRACK_SWITCH, a.default.SUBTITLE_TRACK_LOADED, a.default.SUBTITLE_FRAG_PROCESSED) || this;
                return r.config = e.config,
                r.vttFragSNsProcessed = {},
                r.vttFragQueues = void 0,
                r.currentlyProcessing = null,
                r.state = u.STOPPED,
                r.currentTrackId = -1,
                r.decrypter = new o.default(e,e.config),
                r
            }
            return i(e, t),
            e.prototype.onHandlerDestroyed = function() {
                this.state = u.STOPPED
            }
            ,
            e.prototype.clearVttFragQueues = function() {
                var t = this;
                this.vttFragQueues = {},
                this.tracks.forEach(function(e) {
                    t.vttFragQueues[e.id] = []
                })
            }
            ,
            e.prototype.nextFrag = function() {
                if (null === this.currentlyProcessing && this.currentTrackId > -1 && this.vttFragQueues[this.currentTrackId].length) {
                    var t = this.currentlyProcessing = this.vttFragQueues[this.currentTrackId].shift();
                    this.fragCurrent = t,
                    this.hls.trigger(a.default.FRAG_LOADING, {
                        frag: t
                    }),
                    this.state = u.FRAG_LOADING
                }
            }
            ,
            e.prototype.onSubtitleFragProcessed = function(t) {
                t.success && this.vttFragSNsProcessed[t.frag.trackId].push(t.frag.sn),
                this.currentlyProcessing = null,
                this.state = u.IDLE,
                this.nextFrag()
            }
            ,
            e.prototype.onMediaAttached = function() {
                this.state = u.IDLE
            }
            ,
            e.prototype.onError = function(t) {
                var e = t.frag;
                e && "subtitle" !== e.type || this.currentlyProcessing && (this.currentlyProcessing = null,
                this.nextFrag())
            }
            ,
            e.prototype.doTick = function() {
                var t = this;
                switch (this.state) {
                case u.IDLE:
                    var e, r = this.tracks, i = this.currentTrackId, o = this.vttFragSNsProcessed[i], s = this.vttFragQueues[i], l = this.currentlyProcessing ? this.currentlyProcessing.sn : -1;
                    if (!r)
                        break;
                    if (i < r.length && (e = r[i].details),
                    void 0 === e)
                        break;
                    e.fragments.forEach(function(e) {
                        (function(t) {
                            return o.indexOf(t.sn) > -1
                        }
                        )(e) || e.sn === l || function(t) {
                            return s.some(function(e) {
                                return e.sn === t.sn
                            })
                        }(e) || (e.encrypted ? (n.logger.log("Loading key for " + e.sn),
                        t.state = u.KEY_LOADING,
                        t.hls.trigger(a.default.KEY_LOADING, {
                            frag: e
                        })) : (e.trackId = i,
                        s.push(e),
                        t.nextFrag()))
                    })
                }
            }
            ,
            e.prototype.onSubtitleTracksUpdated = function(t) {
                var e = this;
                n.logger.log("subtitle tracks updated"),
                this.tracks = t.subtitleTracks,
                this.clearVttFragQueues(),
                this.vttFragSNsProcessed = {},
                this.tracks.forEach(function(t) {
                    e.vttFragSNsProcessed[t.id] = []
                })
            }
            ,
            e.prototype.onSubtitleTrackSwitch = function(t) {
                if (this.currentTrackId = t.id,
                this.tracks && -1 !== this.currentTrackId) {
                    var e = this.tracks[this.currentTrackId];
                    e && e.details && this.tick()
                }
            }
            ,
            e.prototype.onSubtitleTrackLoaded = function() {
                this.tick()
            }
            ,
            e.prototype.onKeyLoaded = function() {
                this.state === u.KEY_LOADING && (this.state = u.IDLE,
                this.tick())
            }
            ,
            e.prototype.onFragLoaded = function(t) {
                var e = this.fragCurrent
                  , r = t.frag.decryptdata
                  , i = t.frag
                  , n = this.hls;
                if (this.state === u.FRAG_LOADING && e && "subtitle" === t.frag.type && e.sn === t.frag.sn && t.payload.byteLength > 0 && null != r && null != r.key && "AES-128" === r.method) {
                    var o;
                    try {
                        o = l.now()
                    } catch (t) {
                        o = Date.now()
                    }
                    this.decrypter.decrypt(t.payload, r.key.buffer, r.iv.buffer, function(t) {
                        var e;
                        try {
                            e = l.now()
                        } catch (t) {
                            e = Date.now()
                        }
                        n.trigger(a.default.FRAG_DECRYPTED, {
                            frag: i,
                            payload: t,
                            stats: {
                                tstart: o,
                                tdecrypt: e
                            }
                        })
                    })
                }
            }
            ,
            e
        }(s.default);
        e.default = d
    }
    , function(t, e, r) {
        "use strict";
        var i = this && this.__extends || function() {
            var t = Object.setPrototypeOf || {
                __proto__: []
            }instanceof Array && function(t, e) {
                t.__proto__ = e
            }
            || function(t, e) {
                for (var r in e)
                    e.hasOwnProperty(r) && (t[r] = e[r])
            }
            ;
            return function(e, r) {
                function i() {
                    this.constructor = e
                }
                t(e, r),
                e.prototype = null === r ? Object.create(r) : (i.prototype = r.prototype,
                new i)
            }
        }();
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var a = r(4)
          , n = r(1)
          , o = r(2)
          , s = r(0)
          , l = window.XMLHttpRequest
          , u = "com.widevine.alpha"
          , d = "com.microsoft.playready"
          , c = function(t) {
            function e(e) {
                var r = t.call(this, e, n.default.MEDIA_ATTACHED, n.default.MANIFEST_PARSED) || this;
                return r._widevineLicenseUrl = e.config.widevineLicenseUrl,
                r._licenseXhrSetup = e.config.licenseXhrSetup,
                r._emeEnabled = e.config.emeEnabled,
                r._requestMediaKeySystemAccess = e.config.requestMediaKeySystemAccessFunc,
                r._mediaKeysList = [],
                r._media = null,
                r._hasSetMediaKeys = !1,
                r._isMediaEncrypted = !1,
                r._requestLicenseFailureCount = 0,
                r
            }
            return i(e, t),
            e.prototype.getLicenseServerUrl = function(t) {
                var e;
                switch (t) {
                case u:
                    e = this._widevineLicenseUrl;
                    break;
                default:
                    e = null
                }
                return e || (s.logger.error('No license server URL configured for key-system "' + t + '"'),
                this.hls.trigger(n.default.ERROR, {
                    type: o.ErrorTypes.KEY_SYSTEM_ERROR,
                    details: o.ErrorDetails.KEY_SYSTEM_LICENSE_REQUEST_FAILED,
                    fatal: !0
                })),
                e
            }
            ,
            e.prototype._attemptKeySystemAccess = function(t, e, r) {
                var i = this
                  , a = function(t, e, r) {
                    switch (t) {
                    case u:
                        return function(t, e, r) {
                            var i = {
                                videoCapabilities: []
                            };
                            return e.forEach(function(t) {
                                i.videoCapabilities.push({
                                    contentType: 'video/mp4; codecs="' + t + '"'
                                })
                            }),
                            [i]
                        }(0, r);
                    default:
                        throw Error("Unknown key-system: " + t)
                    }
                }(t, 0, r);
                a ? (s.logger.log("Requesting encrypted media key-system access"),
                this.requestMediaKeySystemAccess(t, a).then(function(e) {
                    i._onMediaKeySystemAccessObtained(t, e)
                }).catch(function(e) {
                    s.logger.error('Failed to obtain key-system "' + t + '" access:', e)
                })) : s.logger.warn("Can not create config for key-system (maybe because platform is not supported):", t)
            }
            ,
            Object.defineProperty(e.prototype, "requestMediaKeySystemAccess", {
                get: function() {
                    if (!this._requestMediaKeySystemAccess)
                        throw new Error("No requestMediaKeySystemAccess function configured");
                    return this._requestMediaKeySystemAccess
                },
                enumerable: !0,
                configurable: !0
            }),
            e.prototype._onMediaKeySystemAccessObtained = function(t, e) {
                var r = this;
                s.logger.log('Access for key-system "' + t + '" obtained');
                var i = {
                    mediaKeys: null,
                    mediaKeysSession: null,
                    mediaKeysSessionInitialized: !1,
                    mediaKeySystemAccess: e,
                    mediaKeySystemDomain: t
                };
                this._mediaKeysList.push(i),
                e.createMediaKeys().then(function(e) {
                    i.mediaKeys = e,
                    s.logger.log('Media-keys created for key-system "' + t + '"'),
                    r._onMediaKeysCreated()
                }).catch(function(t) {
                    s.logger.error("Failed to create media-keys:", t)
                })
            }
            ,
            e.prototype._onMediaKeysCreated = function() {
                var t = this;
                this._mediaKeysList.forEach(function(e) {
                    e.mediaKeysSession || (e.mediaKeysSession = e.mediaKeys.createSession(),
                    t._onNewMediaKeySession(e.mediaKeysSession))
                })
            }
            ,
            e.prototype._onNewMediaKeySession = function(t) {
                var e = this;
                s.logger.log("New key-system session " + t.sessionId),
                t.addEventListener("message", function(r) {
                    e._onKeySessionMessage(t, r.message)
                }, !1)
            }
            ,
            e.prototype._onKeySessionMessage = function(t, e) {
                s.logger.log("Got EME message event, creating license request"),
                this._requestLicense(e, function(e) {
                    s.logger.log("Received license data, updating key-session"),
                    t.update(e)
                })
            }
            ,
            e.prototype._onMediaEncrypted = function(t, e) {
                s.logger.log('Media is encrypted using "' + t + '" init data type'),
                this._isMediaEncrypted = !0,
                this._mediaEncryptionInitDataType = t,
                this._mediaEncryptionInitData = e,
                this._attemptSetMediaKeys(),
                this._generateRequestWithPreferredKeySession()
            }
            ,
            e.prototype._attemptSetMediaKeys = function() {
                if (!this._hasSetMediaKeys) {
                    var t = this._mediaKeysList[0];
                    if (!t || !t.mediaKeys)
                        return s.logger.error("Fatal: Media is encrypted but no CDM access or no keys have been obtained yet"),
                        void this.hls.trigger(n.default.ERROR, {
                            type: o.ErrorTypes.KEY_SYSTEM_ERROR,
                            details: o.ErrorDetails.KEY_SYSTEM_NO_KEYS,
                            fatal: !0
                        });
                    s.logger.log("Setting keys for encrypted media"),
                    this._media.setMediaKeys(t.mediaKeys),
                    this._hasSetMediaKeys = !0
                }
            }
            ,
            e.prototype._generateRequestWithPreferredKeySession = function() {
                var t = this
                  , e = this._mediaKeysList[0];
                if (!e)
                    return s.logger.error("Fatal: Media is encrypted but not any key-system access has been obtained yet"),
                    void this.hls.trigger(n.default.ERROR, {
                        type: o.ErrorTypes.KEY_SYSTEM_ERROR,
                        details: o.ErrorDetails.KEY_SYSTEM_NO_ACCESS,
                        fatal: !0
                    });
                if (e.mediaKeysSessionInitialized)
                    s.logger.warn("Key-Session already initialized but requested again");
                else {
                    var r = e.mediaKeysSession;
                    r || (s.logger.error("Fatal: Media is encrypted but no key-session existing"),
                    this.hls.trigger(n.default.ERROR, {
                        type: o.ErrorTypes.KEY_SYSTEM_ERROR,
                        details: o.ErrorDetails.KEY_SYSTEM_NO_SESSION,
                        fatal: !0
                    }));
                    var i = this._mediaEncryptionInitDataType
                      , a = this._mediaEncryptionInitData;
                    s.logger.log('Generating key-session request for "' + i + '" init data type'),
                    e.mediaKeysSessionInitialized = !0,
                    r.generateRequest(i, a).then(function() {
                        s.logger.debug("Key-session generation succeeded")
                    }).catch(function(e) {
                        s.logger.error("Error generating key-session request:", e),
                        t.hls.trigger(n.default.ERROR, {
                            type: o.ErrorTypes.KEY_SYSTEM_ERROR,
                            details: o.ErrorDetails.KEY_SYSTEM_NO_SESSION,
                            fatal: !1
                        })
                    })
                }
            }
            ,
            e.prototype._createLicenseXhr = function(t, e, r) {
                var i = new l
                  , a = this._licenseXhrSetup;
                try {
                    if (a)
                        try {
                            a(i, t)
                        } catch (e) {
                            i.open("POST", t, !0),
                            a(i, t)
                        }
                    i.readyState || i.open("POST", t, !0)
                } catch (t) {
                    return s.logger.error("Error setting up key-system license XHR", t),
                    void this.hls.trigger(n.default.ERROR, {
                        type: o.ErrorTypes.KEY_SYSTEM_ERROR,
                        details: o.ErrorDetails.KEY_SYSTEM_LICENSE_REQUEST_FAILED,
                        fatal: !0
                    })
                }
                return i.responseType = "arraybuffer",
                i.onreadystatechange = this._onLicenseRequestReadyStageChange.bind(this, i, t, e, r),
                i
            }
            ,
            e.prototype._onLicenseRequestReadyStageChange = function(t, e, r, i) {
                switch (t.readyState) {
                case 4:
                    if (200 === t.status)
                        this._requestLicenseFailureCount = 0,
                        s.logger.log("License request succeeded"),
                        i(t.response);
                    else {
                        if (s.logger.error("License Request XHR failed (" + e + "). Status: " + t.status + " (" + t.statusText + ")"),
                        this._requestLicenseFailureCount++,
                        this._requestLicenseFailureCount <= 3) {
                            var a = 3 - this._requestLicenseFailureCount + 1;
                            return s.logger.warn("Retrying license request, " + a + " attempts left"),
                            void this._requestLicense(r, i)
                        }
                        this.hls.trigger(n.default.ERROR, {
                            type: o.ErrorTypes.KEY_SYSTEM_ERROR,
                            details: o.ErrorDetails.KEY_SYSTEM_LICENSE_REQUEST_FAILED,
                            fatal: !0
                        })
                    }
                }
            }
            ,
            e.prototype._generateLicenseRequestChallenge = function(t, e) {
                var r;
                return t.mediaKeySystemDomain === d ? s.logger.error("PlayReady is not supported (yet)") : t.mediaKeySystemDomain === u ? r = e : s.logger.error("Unsupported key-system:", t.mediaKeySystemDomain),
                r
            }
            ,
            e.prototype._requestLicense = function(t, e) {
                s.logger.log("Requesting content license for key-system");
                var r = this._mediaKeysList[0];
                if (!r)
                    return s.logger.error("Fatal error: Media is encrypted but no key-system access has been obtained yet"),
                    void this.hls.trigger(n.default.ERROR, {
                        type: o.ErrorTypes.KEY_SYSTEM_ERROR,
                        details: o.ErrorDetails.KEY_SYSTEM_NO_ACCESS,
                        fatal: !0
                    });
                var i = this.getLicenseServerUrl(r.mediaKeySystemDomain)
                  , a = this._createLicenseXhr(i, t, e);
                s.logger.log("Sending license request to URL: " + i),
                a.send(this._generateLicenseRequestChallenge(r, t))
            }
            ,
            e.prototype.onMediaAttached = function(t) {
                var e = this;
                if (this._emeEnabled) {
                    var r = t.media;
                    this._media = r,
                    r.addEventListener("encrypted", function(t) {
                        e._onMediaEncrypted(t.initDataType, t.initData)
                    })
                }
            }
            ,
            e.prototype.onManifestParsed = function(t) {
                if (this._emeEnabled) {
                    var e = t.levels.map(function(t) {
                        return t.audioCodec
                    })
                      , r = t.levels.map(function(t) {
                        return t.videoCodec
                    });
                    this._attemptKeySystemAccess(u, e, r)
                }
            }
            ,
            e
        }(a.default);
        e.default = c
    }
    , function(t, e, r) {
        "use strict";
        Object.defineProperty(e, "__esModule", {
            value: !0
        });
        var i = "undefined" != typeof window && window.navigator && window.navigator.requestMediaKeySystemAccess ? window.navigator.requestMediaKeySystemAccess.bind(window.navigator) : null;
        e.requestMediaKeySystemAccess = i
    }
    ]).default
});
