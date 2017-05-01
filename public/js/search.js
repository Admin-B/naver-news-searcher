var cache = fs.readFileSync(__dirname + '/cache.json');
cache = JSON.parse(cache);
function wholeSearchUser(id, start, limit, callback) {
    if (loading === true) {
        return;
    }
    loading = true;

    var keys = Object.keys(cache);
    var c = 0;
    var l = Math.min(start + limit, keys.length);
    for (var i = start; i < l; i++) {
        if (keys[i] === 'lastUpdate') {
            if (++c === l - start) {
                loading = false;
            }
            callback([], c, l - start, oid, aid);
            continue;
        }
        var k = keys[i].split(',');
        var oid = k[0],
            aid = k[1];
        /*
                if (cache[keys[i]].comments.length !== 0) {
                    var comments = cache[keys[i]].comments;
                    var result = [];
                    for (var j = 0, len = comments.length; j < len; j++) {
                        if (comments[j].userIdNo === id) {
                            result.push(comments[j]);
                        }
                    }
                    if (++c === l - start) {
                        loading = false;
                    }
                    callback(result, c, l - start, oid, aid);
                } else { */
        (function (oid, aid) {
            _search(oid, aid, id, function (r) {
                if (++c === l - start) {
                    loading = false;
                }
                callback(r, c, l - start, oid, aid);
            });
        })(oid, aid);
    }
}
function searchUser(oid, aid, id, callback) {
    if (loading === true) {
        return;
    }
    loading = true;
    _search(oid, aid, id, function (r) {
        loading = false;
        callback(r);
    });
}
function _search(oid, aid, id, callback) {
    var hash = oid + "," + aid;
    if (!cache[hash]) {
        cache[hash] = {
            comments: []
        };
    }
    var temp = [];

    gComments(oid, aid, function (comments) {
        if (cache[hash].comments.length !== 0) {
            var ftime = (new Date(cache[hash].comments[0].regTime)).getTime();

            for (var i = 0; i < comments.length; i++) {
                var t = (new Date(comments[i].regTime)).getTime();
                if (t <= ftime) {
                    temp = temp.concat(comments.slice(0, Math.max(i - 1, 0)));
                    return false;
                }
            }
        }
        temp = temp.concat(comments);
        return comments.length === 100;
    }, function () {
        if (temp.length !== 0) {
            cache[hash].comments = temp.concat(cache[hash].comments);
        }
        var c = cache[hash].comments;

        var result = [];
        for (var i = 0, l = c.length; i < l; i++) {
            if (c[i].userIdNo === id) {
                result.push(c[i]);
            }
        }
        if (typeof callback === 'function') {
            callback(result);
        }
    });
}
function gComments(oid, aid, subcallback, callback) {
    var newspage = "http://news.naver.com/main/read.nhn?oid=" + oid + '&aid=' + aid;
    var jsonurl = "https://apis.naver.com/commentBox/cbox/web_naver_list_jsonp.json";

    requestComment(1);
    function requestComment(no) {
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
                page: no,
                initialize: "true",
                useAltSort: "true",
                replayPageSize: "20",
                sort: "new",
            }
        }, function (err, res, body) {
            if (err || !body) {
                callback();
                return;
            }
            var tempStr = body.split('_callback(')[1];
            var jsonData = JSON.parse(tempStr.substring(0, tempStr.length - 2));

            var comments = jsonData.result.commentList;

            if (subcallback(comments)) {
                requestComment(no + 1);
            } else {
                callback();
            }
        });
    }
}

(function () {
    var update = cache.lastUpdate;
    var n = (new Date()).format('yyyyMMdd');

    if (!update) {
        for (var i = 0; i < 7; i++) {
            var date = new Date();
            date.setDate(date.getDate() - i)
            var date = date.format('yyyyMMdd');
            _e(date);
        }
    } else if (update !== n) {
        _e(n);
    }

    function _e(now) {
        var token = 'http://news.naver.com/main/ranking/popularDay.nhn?rankingType=popular_day&sectionId=000&date=' + now;
        var oidaid = [];

        request(token, function (err, res, body) {
            if (err) {
                alert('주요기사를 읽어오는데에 실패하였습니다.');
                return;
            }
            var split = body.split('oid=');
            for (var i = 1, len = split.length; i < len; i++) {
                var temp = split[i].split('&');
                var oid = temp[0];
                var aid = temp[1].slice(4, 14);

                if (!cache[oid + ',' + aid]) {
                    cache[oid + ',' + aid] = {
                        comments: []
                    };
                }
            }
            cache.lastUpdate = now;
        });
    }
})();

window.onbeforeunload = function () {
    var keys = Object.keys(cache);
    var store = {};
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k === 'lastUpdate') {
            continue;
        }
        var c = cache[k].comments;
        store[k] = {
            comments: []
        };
        for (var j = 0; j < c.length; j++) {
            store[k].comments.push({
                maskedUserId: c[j].maskedUserId,
                idProvider: c[j].idProvider,
                userName: c[j].userName,
                commentNo: c[j].commentNo,
                userIdNo: c[j].userIdNo,
                contents: c[j].contents,
                regTime: c[j].regTime
            });
        }
    }
    var str = JSON.stringify(store);
    fs.writeFileSync(__dirname + '/cache.json', str);
}