// ==UserScript==
// @name         Moderator History Improvements
// @description  Better UI for mod action history page. Auto-refresh every minute.
// @homepage     https://github.com/samliew/SO-mod-userscripts
// @author       @samliew
// @version      1.3
//
// @include      https://stackoverflow.com/admin/history/*
//
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';


    let $historyContainer;


    function processNewItems($items) {

        // Linkify stuff on history page
        $items.children('li').each(function() {
            let t = this.innerHTML.trim().replace(/\s*- no link available\s*/, '');
            this.innerHTML = t;
        });

        $('ul li', $items).each(function() {

            let t = this.innerText.trim().replace(/\s*- no link available\s*/, '').replace(/- from question id =/, 'for question').replace(/- for id =/, '').replace(/-$/, '');

            if(t.includes('Declined)')) $(this).addClass('mod-declined');
            else if(t.includes('Flag processed')) $(this).addClass('mod-helpful');

            if(/^♦/.test(t)) {
                $(this).addClass('mod-actions');
            }

            if(/Comment deleted:/.test(t)) {
                t = t.replace(/^Comment deleted: (.*)/, `<em>$1</em>`);
                $(this).addClass('type-cmnt');
            }
            else if(t.includes('(AnswerNotAnAnswer')) {
                $(this).addClass('type-naa');
            }
            else if(t.includes('(PostOther')) {
                $(this).addClass('type-postother');
            }
            else if(t.includes('(PostLowQuality')) {
                $(this).addClass('type-vlq');
            }
            else if(t.includes('(PostTooManyCommentsAuto')) {
                $(this).addClass('type-toomanycmnts');
            }
            else if(/^Moderator (deletes|destroys) user/.test(t)) {
                t = t.replace(/(\d+)/, `<a href="https://${location.hostname}/users/$1" target="_blank" title="view user">$1</a>`);
                $(this).addClass('mod-destroys');
            }
            else if(/(Moderator contacts user|See user-message)/.test(t)) {
                t = t.replace(/(\d+)/, `<a href="https://${location.hostname}/users/message/$1" target="_blank" title="view message">$1</a>`);
                $(this).addClass('mod-contacts-user');
            }
            else if(/(Moderator removes bounty)/.test(t)) {
                t = t.replace(/(\d+)/, `<a href="https://${location.hostname}/questions/$1" target="_blank" title="view question">$1</a>`);
                $(this).addClass('mod-removes-bounty');
            }
            else if(/(Moderator edits comment)/.test(t)) {
                t = t.replace(/ - on post id = (\d+), comment id = (\d+)/, ` <a href="https://${location.hostname}/posts/comments/$2" target="_blank" title="view comment">$2</a>`);
                $(this).addClass('mod-edits-comment');
            }

            t = t.replace(/Flag processed \((\w+), (Declined|Helpful)\)/, '$1');

            this.innerHTML = t;
        });
    }


    function updatePage() {

        $.get(location.href, function(page) {

            const existingItemIds = $('#mod-user-history > li').get().map(v => Number(v.dataset.pid));
            const $items = $('#mod-user-history > li', page);

            // Preprocess items to get pid
            let $newItems = $items.filter(function(i, el) {
                const url = $(el).find('a.answer-hyperlink, a.question-hyperlink').first().attr('href');
                const pid = Number(url.match(/\/(\d+)/g).pop().replace('/', ''));
                $(this).attr('data-pid', pid);

                // Return items that are new
                return !existingItemIds.includes(pid);
            })
            .prependTo($historyContainer);

            processNewItems($newItems);
            StackExchange.realtime.updateRelativeDates();
        });
    }


    function doPageLoad() {

        $historyContainer = $('#mod-user-history');

        // Preprocess items to get pid
        const $items = $historyContainer.children('li');
        $items.each(function(i, el) {
            const url = $(el).find('a.answer-hyperlink, a.question-hyperlink').first().attr('href');
            const pid = Number(url.match(/\/(\d+)/g).pop().replace('/', ''));
            $(this).attr('data-pid', pid);
        });
        processNewItems($items);

        // Set page title
        const mod = $('#mod-user-history').parent().prev().find('.user-info');
        const modname = mod.find('.user-details a').first().text();
        document.title = `${modname} - mod history`;

        // Links open in new window since this page auto-updates
        $('#mod-user-history').on('click', 'a', (i, el) => el.target = '_blank');

        // Auto update history
        setInterval(updatePage, 30000);
    }


    GM_addStyle(`
.mod-page #mod-user-history {
    margin-top: 20px;
    margin-left: 10px;
}
.mod-page #mod-user-history ul {
    margin-left: 0 !important;
}
.mod-page #mod-user-history .question-hyperlink,
.mod-page #mod-user-history .answer-hyperlink {
    margin-bottom: 0;
}
.mod-page #mod-user-history .question-hyperlink:before {
    content: 'Q: ';
}
.mod-page #mod-user-history li {
    margin-top: 10px;
    padding: 0 !important;
}
.mod-page #mod-user-history > li {
    position: relative; /* for Post IDs Everywhere userscript */
    display: grid;
    grid-template-columns: 84px 1fr;
    margin-bottom: 25px;
    font-size: 0; /* to fix stray hyphen without FOUC */
}
.mod-page #mod-user-history > li > * {
    grid-column: 2;
    font-size: 1rem; /* to fix stray hyphen without FOUC */
}
.mod-page #mod-user-history > li .question-hyperlink {
    font-size: 1.2rem; /* to fix stray hyphen without FOUC */
}
.mod-page #mod-user-history > li > .relativetime {
    grid-column: 1;
    padding-right: 10px;
    text-align: right;
    color: #999;
    white-space: nowrap;
}
.mod-page #mod-user-history > li > .relativetime + ul > li:first-child {
    margin-top: 0;
}
.mod-page #mod-user-history > li > *:nth-child(2) {
    grid-row: 1;
}
.mod-page #mod-user-history li.mod-helpful:before {
    content: 'Helpful: ';
    color: #393;
}
.mod-page #mod-user-history li.mod-declined:before {
    content: 'Declined: ';
    color: #E33;
}
.mod-page #mod-user-history li.mod-actions {
    display: inline-block;
    margin-top: 5px;
    padding: 3px 10px 3px 8px !important;
    background: #eee;
}
.mod-page #mod-user-history li.mod-destroys {
    color: #E33;
}
.mod-page #mod-user-history li.type-cmnt:before {
    content: 'Comment deleted: ';
    color: #393;
}
.mod-page #mod-user-history li.type-cmnt em {
    padding: 1px 8px;
    font-style: normal;
    color: #555;
    background: #fee;
}
.mod-page #mod-user-history li.type-toomanycmnts ~ li {
    display: none;
}
`);


    // Page is ready
    doPageLoad();


})();