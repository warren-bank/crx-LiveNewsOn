// ==UserScript==
// @name         LiveNewsOn
// @description  Watch videos in external player.
// @version      1.0.0
// @match        *://livenewson.com/*
// @match        *://*.livenewson.com/*
// @match        *://livenewsus.com/*
// @match        *://*.livenewsus.com/*
// @match        *://livenewsbox.com/*
// @match        *://*.livenewsbox.com/*
// @match        *://livenewsnow.com/*
// @match        *://*.livenewsnow.com/*
// @match        *://livenewswatch.com/*
// @match        *://*.livenewswatch.com/*
// @match        *://livenewsmag.com/*
// @match        *://*.livenewsmag.com/*
// @icon         https://cdn.livenewsnow.com/wp-content/uploads/2019/02/favicon.png
// @run-at       document-end
// @grant        unsafeWindow
// @homepage     https://github.com/warren-bank/crx-LiveNewsOn/tree/webmonkey-userscript/es5
// @supportURL   https://github.com/warren-bank/crx-LiveNewsOn/issues
// @downloadURL  https://github.com/warren-bank/crx-LiveNewsOn/raw/webmonkey-userscript/es5/webmonkey-userscript/LiveNewsOn.user.js
// @updateURL    https://github.com/warren-bank/crx-LiveNewsOn/raw/webmonkey-userscript/es5/webmonkey-userscript/LiveNewsOn.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

// ----------------------------------------------------------------------------- constants

var user_options = {
  "redirect_to_webcast_reloaded": true,
  "force_http":                   true,
  "force_https":                  false,

  "timeout_ms": {
    "live_videostream":           0
  }
}

// ----------------------------------------------------------------------------- URL links to tools on Webcast Reloaded website

var get_webcast_reloaded_url = function(video_url, vtt_url, referer_url, force_http, force_https) {
  force_http  = (typeof force_http  === 'boolean') ? force_http  : user_options.force_http
  force_https = (typeof force_https === 'boolean') ? force_https : user_options.force_https

  var encoded_video_url, encoded_vtt_url, encoded_referer_url, webcast_reloaded_base, webcast_reloaded_url

  encoded_video_url     = encodeURIComponent(encodeURIComponent(btoa(video_url)))
  encoded_vtt_url       = vtt_url ? encodeURIComponent(encodeURIComponent(btoa(vtt_url))) : null
  referer_url           = referer_url ? referer_url : unsafeWindow.location.href
  encoded_referer_url   = encodeURIComponent(encodeURIComponent(btoa(referer_url)))

  webcast_reloaded_base = {
    "https": "https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html",
    "http":  "http://webcast-reloaded.surge.sh/index.html"
  }

  webcast_reloaded_base = (force_http)
                            ? webcast_reloaded_base.http
                            : (force_https)
                               ? webcast_reloaded_base.https
                               : (video_url.toLowerCase().indexOf('http:') === 0)
                                  ? webcast_reloaded_base.http
                                  : webcast_reloaded_base.https

  webcast_reloaded_url  = webcast_reloaded_base + '#/watch/' + encoded_video_url + (encoded_vtt_url ? ('/subtitle/' + encoded_vtt_url) : '') + '/referer/' + encoded_referer_url
  return webcast_reloaded_url
}

// ----------------------------------------------------------------------------- URL redirect

var redirect_to_url = function(url) {
  if (!url) return

  if (typeof GM_loadUrl === 'function') {
    if (typeof GM_resolveUrl === 'function')
      url = GM_resolveUrl(url, unsafeWindow.location.href)

    GM_loadUrl(url, 'Referer', unsafeWindow.location.href)
  }
  else {
    try {
      unsafeWindow.top.location = url
    }
    catch(e) {
      unsafeWindow.window.location = url
    }
  }
}

var process_video_url = function(video_url, video_type, vtt_url, referer_url) {
  if (!referer_url)
    referer_url = unsafeWindow.location.href

  if (typeof GM_startIntent === 'function') {
    // running in Android-WebMonkey: open Intent chooser

    var args = [
      /* action = */ 'android.intent.action.VIEW',
      /* data   = */ video_url,
      /* type   = */ video_type
    ]

    // extras:
    if (vtt_url) {
      args.push('textUrl')
      args.push(vtt_url)
    }
    if (referer_url) {
      args.push('referUrl')
      args.push(referer_url)
    }

    GM_startIntent.apply(this, args)
    return true
  }
  else if (user_options.redirect_to_webcast_reloaded) {
    // running in standard web browser: redirect URL to top-level tool on Webcast Reloaded website

    redirect_to_url(get_webcast_reloaded_url(video_url, vtt_url, referer_url))
    return true
  }
  else {
    return false
  }
}

var process_hls_url = function(hls_url, vtt_url, referer_url) {
  process_video_url(/* video_url= */ hls_url, /* video_type= */ 'application/x-mpegurl', vtt_url, referer_url)
}

var process_dash_url = function(dash_url, vtt_url, referer_url) {
  process_video_url(/* video_url= */ dash_url, /* video_type= */ 'application/dash+xml', vtt_url, referer_url)
}

// ----------------------------------------------------------------------------- process video within iframe

var process_live_videostream = function() {
  var regex, scripts, script, video_url

  regex = {
    whitespace: /[\r\n\t]+/g,
    video_url:  /^.*\s+file:\s+['"]([^'"]+m3u8[^'"]*)['"].*$/
  }

  scripts = unsafeWindow.document.querySelectorAll('script:not([src])')

  for (var i=0; i < scripts.length; i++) {
    script = scripts[i]
    script = script.innerHTML
    script = script.replace(regex.whitespace, ' ')

    if (regex.video_url.test(script)) {
      video_url = script.replace(regex.video_url, '$1')
      break
    }
  }

  if (!video_url)
    return

  process_hls_url(video_url)
}

// ----------------------------------------------------------------------------- bootstrap

var init = function() {
  if (user_options.timeout_ms.live_videostream > 0)
    setTimeout(process_live_videostream, user_options.timeout_ms.live_videostream)
  else
    process_live_videostream()
}

init()

// -----------------------------------------------------------------------------
