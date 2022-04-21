const netlifyTomlContent = `
[build.processing]
  skip_processing = false
[build.processing.css]
  bundle = true
  minify = true
[build.processing.js]
  bundle = true
  minify = true
[build.processing.html]
  pretty_urls = true
[build.processing.images]
  compress = true
[[headers]]
  for = "/*"
  [headers.values]
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "no-referrer"
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "deny"
    Content-Security-Policy = """
      default-src 
        'self'
        ; 
      script-src 
        'self' 
        blob: 
        https://assets.dcube.cloud 
        https://*.wogaa.sg 
        https://assets.adobedtm.com 
        https://www.google-analytics.com 
        https://cdnjs.cloudflare.com 
        https://va.ecitizen.gov.sg 
        https://*.cloudfront.net 
        https://printjs-4de6.kxcdn.com 
        https://unpkg.com 
        https://wogadobeanalytics.sc.omtrdc.net 
        https://connect.facebook.net 
        https://graph.facebook.com 
        https://facebook.com 
        https://www.facebook.com 
        https://www.googletagmanager.com 
        https://*.licdn.com 
        https://webchat.vica.gov.sg 
        https://vica.gov.sg
        https://www.google.com/recaptcha/
        https://www.gstatic.com/recaptcha/
        https://static.zdassets.com
        https://ekr.zdassets.com
        https://*.zendesk.com
        https://*.zopim.com
        wss://*.zendesk.com
        wss://*.zopim.com
        ; 
      object-src 
        'self'
        ; 
      style-src 
        'self' 
        'unsafe-inline'
        https://fonts.googleapis.com/ 
        https://*.cloudfront.net 
        https://va.ecitizen.gov.sg 
        https://*.wogaa.sg 
        https://cdnjs.cloudflare.com 
        https://datagovsg.github.io 
        https://webchat.vica.gov.sg 
        https://vica.gov.sg
        https://unpkg.com
        ; 
      img-src 
        *
        ; 
      media-src 
        *
        ; 
      frame-src 
        https://form.gov.sg/ 
        https://wogaa.demdex.net/ 
        https://*.youtube.com 
        https://*.youtube-nocookie.com 
        https://*.vimeo.com 
        https://www.google.com 
        https://checkfirst.gov.sg 
        https://www.checkfirst.gov.sg 
        https://docs.google.com 
        https://nlb.ap.panopto.com
        https://www.google.com/recaptcha/
        https://www.gstatic.com/recaptcha/
        https://data.gov.sg
        ; 
      frame-ancestors 
        'none'
        ; 
      font-src 
        * 
        data:
        ; 
      connect-src 
        'self' 
        https://dpm.demdex.net 
        https://www.google-analytics.com 
        https://stats.g.doubleclick.net 
        https://*.wogaa.sg 
        https://va.ecitizen.gov.sg 
        https://ifaqs.flexanswer.com 
        https://*.cloudfront.net 
        https://fonts.googleapis.com 
        https://cdnjs.cloudflare.com 
        https://wogadobeanalytics.sc.omtrdc.net 
        https://data.gov.sg 
        https://api.isomer.gov.sg
        https://webchat.vica.gov.sg
        https://chat.vica.gov.sg
        https://vica.gov.sg
        https://s3-va-prd-vica.s3-ap-southeast-1.amazonaws.com
        wss://chat.vica.gov.sg
        https://api-vica-ana.vica.gov.sg/api/v1/response-ratings
        https://static.zdassets.com
        https://ekr.zdassets.com
        https://*.zendesk.com
        https://*.zopim.com
        wss://*.zendesk.com
        wss://*.zopim.com
        ;
      """
`

const netlifyTomlHeaderValues = {
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "deny",
  "Content-Security-Policy":
    "      default-src \n" +
    "        'self'\n" +
    "        ; \n" +
    "      script-src \n" +
    "        'self' \n" +
    "        blob: \n" +
    "        https://assets.dcube.cloud \n" +
    "        https://*.wogaa.sg \n" +
    "        https://assets.adobedtm.com \n" +
    "        https://www.google-analytics.com \n" +
    "        https://cdnjs.cloudflare.com \n" +
    "        https://va.ecitizen.gov.sg \n" +
    "        https://*.cloudfront.net \n" +
    "        https://printjs-4de6.kxcdn.com \n" +
    "        https://unpkg.com \n" +
    "        https://wogadobeanalytics.sc.omtrdc.net \n" +
    "        https://connect.facebook.net \n" +
    "        https://graph.facebook.com \n" +
    "        https://facebook.com \n" +
    "        https://www.facebook.com \n" +
    "        https://www.googletagmanager.com \n" +
    "        https://*.licdn.com \n" +
    "        https://webchat.vica.gov.sg \n" +
    "        https://vica.gov.sg\n" +
    "        https://www.google.com/recaptcha/\n" +
    "        https://www.gstatic.com/recaptcha/\n" +
    "        https://static.zdassets.com\n" +
    "        https://ekr.zdassets.com\n" +
    "        https://*.zendesk.com\n" +
    "        https://*.zopim.com\n" +
    "        wss://*.zendesk.com\n" +
    "        wss://*.zopim.com\n" +
    "        ; \n" +
    "      object-src \n" +
    "        'self'\n" +
    "        ; \n" +
    "      style-src \n" +
    "        'self' \n" +
    "        'unsafe-inline'\n" +
    "        https://fonts.googleapis.com/ \n" +
    "        https://*.cloudfront.net \n" +
    "        https://va.ecitizen.gov.sg \n" +
    "        https://*.wogaa.sg \n" +
    "        https://cdnjs.cloudflare.com \n" +
    "        https://datagovsg.github.io \n" +
    "        https://webchat.vica.gov.sg \n" +
    "        https://vica.gov.sg\n" +
    "        https://unpkg.com\n" +
    "        ; \n" +
    "      img-src \n" +
    "        *\n" +
    "        ; \n" +
    "      media-src \n" +
    "        *\n" +
    "        ; \n" +
    "      frame-src \n" +
    "        https://form.gov.sg/ \n" +
    "        https://wogaa.demdex.net/ \n" +
    "        https://*.youtube.com \n" +
    "        https://*.youtube-nocookie.com \n" +
    "        https://*.vimeo.com \n" +
    "        https://www.google.com \n" +
    "        https://checkfirst.gov.sg \n" +
    "        https://www.checkfirst.gov.sg \n" +
    "        https://docs.google.com \n" +
    "        https://nlb.ap.panopto.com\n" +
    "        https://www.google.com/recaptcha/\n" +
    "        https://www.gstatic.com/recaptcha/\n" +
    "        https://data.gov.sg\n" +
    "        ; \n" +
    "      frame-ancestors \n" +
    "        'none'\n" +
    "        ; \n" +
    "      font-src \n" +
    "        * \n" +
    "        data:\n" +
    "        ; \n" +
    "      connect-src \n" +
    "        'self' \n" +
    "        https://dpm.demdex.net \n" +
    "        https://www.google-analytics.com \n" +
    "        https://stats.g.doubleclick.net \n" +
    "        https://*.wogaa.sg \n" +
    "        https://va.ecitizen.gov.sg \n" +
    "        https://ifaqs.flexanswer.com \n" +
    "        https://*.cloudfront.net \n" +
    "        https://fonts.googleapis.com \n" +
    "        https://cdnjs.cloudflare.com \n" +
    "        https://wogadobeanalytics.sc.omtrdc.net \n" +
    "        https://data.gov.sg \n" +
    "        https://api.isomer.gov.sg\n" +
    "        https://webchat.vica.gov.sg\n" +
    "        https://chat.vica.gov.sg\n" +
    "        https://vica.gov.sg\n" +
    "        https://s3-va-prd-vica.s3-ap-southeast-1.amazonaws.com\n" +
    "        wss://chat.vica.gov.sg\n" +
    "        https://api-vica-ana.vica.gov.sg/api/v1/response-ratings\n" +
    "        https://static.zdassets.com\n" +
    "        https://ekr.zdassets.com\n" +
    "        https://*.zendesk.com\n" +
    "        https://*.zopim.com\n" +
    "        wss://*.zendesk.com\n" +
    "        wss://*.zopim.com\n" +
    "        ;\n" +
    "      ",
}

module.exports = {
  netlifyTomlContent,
  netlifyTomlHeaderValues,
}
