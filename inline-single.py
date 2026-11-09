# After: npx vite build -c vite.single.config.ts   -> run this in dist-single/ to create one HTML file.
import re,base64,glob
h=open("index.html").read()
js=open(glob.glob("assets/index-*.js")[0]).read()
css=open(glob.glob("assets/style-*.css")[0]).read()
b64=lambda f: "data:image/png;base64,"+base64.b64encode(open(f,"rb").read()).decode()
h=re.sub(r'\s*<link rel="manifest"[^>]*>','',h)
h=re.sub(r'<link rel="apple-touch-icon"[^>]*>','<link rel="apple-touch-icon" href="%s" />'%b64("apple-touch-icon.png"),h)
h=re.sub(r'<link rel="icon"[^>]*>','<link rel="icon" href="%s" type="image/png" />'%b64("icon-192.png"),h)
h=re.sub(r'\s*<script type="module"[^>]*></script>','',h)
h=re.sub(r'\s*<link rel="stylesheet"[^>]*>','',h)
h=h.replace("</head>","<style>"+css.replace("</style","<\\/style")+"</style>\n</head>")
h=h.replace("</body>",'<script type="module">'+js.replace("</script","<\\/script")+"</script>\n</body>")
open("../tennis-scorecard.html","w").write(h)
