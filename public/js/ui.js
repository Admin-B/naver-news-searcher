var loading = false;
$(document).ready(function () {
    var searchInput = $("#input-search");
    var $comments = $(".comments");

    var nowNews = {
        oid: null,
        aid: null,
        url: null,
        pageno: 0,
        sort: "favorite",
        lastScroll: false,
        comments: [],
        init: function () {
            this.oid = null;
            this.aid = null;
            this.url = null;
            this.pageno = 1;
            this.sort = 'favorite';
            this.lastScroll = false;
            this.comments = [];
        }
    };

    function inputRequest() {
        if(loading === true){
            return;
        }
        $comments.html('');
        /*
        request({
            url: searchInput.val(),
            headers: {
                'Content-Type': 'content=text/html; charset=euc-kr'
            }
        }, function (err, res, body) {
            if (err) {
                return;
            }
            var title = body.split('<meta property="og:title"			content="')[1];

            if (!title) {
                return;
            }
            title = title.split('"/>')[0];
            $('.input-wrap').after('<h2>' + title + '</h2>');
        });
        */
        getComments(searchInput.val() || "not url", function (cs) {
            printComments(cs);
        }, true);
    }
    searchInput.keypress(function (e) {
        if (e.keyCode === 13) {
            inputRequest();
        }
    });
    $(".btn.btn-search").click(function () {
        inputRequest();
    });
    $(".btn.btn-sort").click(function () {
        if(loading === true){
            return;
        }
        if ($(this).hasClass('active')) {
            return;
        }
        nowNews.sort = $(this).attr('data-type');
        nowNews.pageno = 0;
        nowNews.comments = [];
        nowNews.lastScroll = false;

        $comments.html('');
        var th = $(this);
        $(".btn.btn-sort.active").removeClass('active');
        getComments(function (cs) {
            th.addClass('active');
            printComments(cs);
        });
    });
    $(".btn.btn-more").click(function () {
        getComments(function (cs) {
            printComments(cs);
        });
    });

    $(document).on("click", ".comments > comment", function () {
        if (loading === true) {
            return;
        }
        var th = $(this);
        var user = th.attr("data-id");
        var no = th.attr("data-no");

        if (th.hasClass('active')) {
            th.removeClass('active');
            $("search").remove();
            return;
        }
        $("comment.active").removeClass("active");
        $("search").remove();

        th.addClass("active");
        th.after(
            "<search>" +
            "<div class='title'>댓글작성자 검색<br/><b>" + user + "</b></div>" +
            '<contents><div class="spinner"><div class="rect1"></div><div class="rect2"></div><div class="rect3"></div><div class="rect4"></div><div class="rect5"></div></div></contents>' +
            "</search>"
        );

        var start = (new Date()).getTime();
        searchUser(nowNews.oid, nowNews.aid, user, function (result) {
            var end = (new Date()).getTime();
            var gap = (end - start) / 1000;
            $("search > contents").before('<div class="count">검색결과 ' + result.length + '개 (' + gap + '초)</div>');
            $("search > contents").html('');
            printComments(result, $("search > contents"),nowNews.oid,nowNews.aid);
            $("search > contents").after('<div class="btn btn-reflesh" data-id="' + user + '">다른 주요기사에 작성한 댓글 불러오기<br/><small>(버튼을 누를 때 마다 10개의 기사에서 사용자를 검색합니다.)</small></div>')

            $('html, body').animate({ scrollTop: th.offset().top - 20 }, 400);
        });
    });
    $(document).on("click", "search > contents >  comment", function () {
        var th = $(this);
        var oid = th.attr('oid');
        var aid = th.attr('aid');
        var host = url.parse(nowNews.url).hostname;

        switch (host) {
            case "entertain.naver.com":
                window.open("http://entertain.naver.com/comment/list?commentNo=" + th.attr('data-no') + "&oid=" + oid + "&aid=" + aid, "commentView");
                break;
            default:
                window.open("http://news.naver.com/main/read.nhn?commentNo=" + th.attr('data-no') + "&oid=" + (th.attr('oid') || nowNews.oid) + "&aid=" + (th.attr('aid') || nowNews.aid), "commentView");
        }
    });
    $(document).on("click", "search > .btn-reflesh", function () {
        var start = (new Date()).getTime();
        $('search .btn-reflesh').html('<div class="spinner"><div class="rect1"></div><div class="rect2"></div><div class="rect3"></div><div class="rect4"></div><div class="rect5"></div></div>');
        var f = false;
        var s = Number($('search .btn-reflesh').attr('data-start')) || 0;
        if (s + 10 >= Object.keys(cache).length) {
            alert("모든 기사를 검색했습니다.");
            $('search .btn-reflesh').hide();
            return;
        }
        wholeSearchUser($(this).attr('data-id'), s, 10, function (result, e, limit, oid, aid) {
            if (e === limit) {
                var end = (new Date()).getTime();
                var gap = (end - start) / 1000;
                $("search > .count").html('검색결과 ' + result.length + '개 (' + gap + '초)');
                $('search .btn-reflesh').attr('data-start', s + 10);
                $('search .btn-reflesh').html('다른 주요기사에 작성한 댓글 불러오기<br/><small>(버튼을 누를 때 마다 다른 10개의 주요기사에서 사용자를 검색합니다.)</small>');
            }
            printComments(result, $("search > contents"), oid, aid);
        })
    });

    function printComments(comments, target, oid, aid) {
        var $target = target || $comments;
        for (var i = 0; i < comments.length; i++) {
            var comment = comments[i];
            var name = (comment.maskedUserId || '<span class="sns">[' + comment.idProvider + ']</span> ' + comment.userName);
            $target.append(
                "<comment data-no='" + comment.commentNo + "' data-id='" + comment.userIdNo + "' oid=" + oid + " aid=" + aid + ">" +
                "<name>" + name + "</name>" +
                "<contents>" + comment.contents + "</contents>" +
                "<date>" + (new Date(comment.regTime)).format("yyyy-MM-dd HH:mm ") + "</date>"
                + "</comment>");
        }
    }
    function loadstart() {
        loading = true;
        $(".btn-more").html("loading...");
        searchInput.val(arguments[0]);
    }
    function loadend() {
        loading = false;
        $(".btn-more").html("더보기");
    }
    function getComments(v, callback, s) {
        if (loading === true) {
            return;
        }

        if (typeof v === 'function') {
            callback = v;
            v = undefined;
        }
        var inputUrl = v || nowNews.url;
        var urlParse = url.parse(inputUrl);

        var q = urlParse.query;

        var oid = ((q || '').split('oid=')[1] || '').split('&')[0];
        var aid = ((q || '').split('aid=')[1] || '').split('&')[0];

        var sNews = oid === nowNews.oid && aid === nowNews.aid;
        var pageno = sNews ? nowNews.pageno + 1 : 1; //페이지 번호
        var sort = nowNews.sort; //정렬 (favorite , new)

        if (!oid || !aid) {
            alert("올바르지 않는 url 입니다.");
            return;
        }
        if (nowNews.lastScroll === true && sNews) {
            alert("더 이상 불러올 댓글이 없습니다.");
            return;
        }
        if (s === true) {
            pageno = 1;
        }
        /* 댓글은 페이지당 100개씩 불러올 수 있다. */
        var newspage = inputUrl;
        var jsonurl = "https://apis.naver.com/commentBox/cbox/web_naver_list_jsonp.json";

        loadstart(newspage);
        request({
            method: 'GET',
            url: jsonurl,
            headers: {
                'Referer': newspage
            },
            qs: {
                ticket: 'news',
                pool: 'cbox5',
                _callback: "",
                lang: "ko",
                country: "KR",
                objectId: "news" + oid + "," + aid,
                pageSize: "100",
                indexSize: "10",
                listType: "OBJECT",
                page: pageno,
                initialize: "true",
                useAltSort: "true",
                replayPageSize: "20",
                sort: sort,
            }
        }, function (err, res, body) {
            loadend();

            if (err) {
                alert('500 error');
                return;
            }

            var tempStr = body.split('_callback(')[1];
            var jsonData = JSON.parse(tempStr.substring(0, tempStr.length - 2));

            var comments = jsonData.result.commentList;

            nowNews.oid = oid;
            nowNews.aid = aid;
            nowNews.pageno = pageno;
            nowNews.url = newspage;
            nowNews.comments = nowNews.comments.concat(comments);

            if (comments.length !== 100) {
                nowNews.lastScroll = true;
            }

            if (typeof callback === 'function') {
                callback(comments);
            }
        });
    }
    getComments('http://news.naver.com/main/ranking/read.nhn?mid=etc&sid1=111&rankingType=popular_day&oid=353&aid=0000026786&date=20170430&type=1&rankingSeq=1&rankingSectionId=100&m_view=1', printComments)
});


Date.prototype.format = function (f) {
    if (!this.valueOf()) return " ";

    var weekName = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    var d = this;

    return f.replace(/(yyyy|yy|MM|dd|E|hh|mm|ss|a\/p)/gi, function ($1) {
        switch ($1) {
            case "yyyy": return d.getFullYear();
            case "yy": return (d.getFullYear() % 1000).zf(2);
            case "MM": return (d.getMonth() + 1).zf(2);
            case "dd": return d.getDate().zf(2);
            case "E": return weekName[d.getDay()];
            case "HH": return d.getHours().zf(2);
            case "hh": return ((h = d.getHours() % 12) ? h : 12).zf(2);
            case "mm": return d.getMinutes().zf(2);
            case "ss": return d.getSeconds().zf(2);
            case "a/p": return d.getHours() < 12 ? "오전" : "오후";
            default: return $1;
        }
    });
};

String.prototype.string = function (len) { var s = '', i = 0; while (i++ < len) { s += this; } return s; };
String.prototype.zf = function (len) { return "0".string(len - this.length) + this; };
Number.prototype.zf = function (len) { return this.toString().zf(len); };