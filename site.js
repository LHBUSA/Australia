(()=>{
  if(location.pathname.startsWith('/workspace')){
    const l=document.createElement('link');
    l.rel='stylesheet';
    l.href='/workspace-light.css';
    document.head.appendChild(l);
  }
  const load=(src,done)=>{const s=document.createElement('script');s.src=src;s.async=false;if(done)s.onload=done;document.head.appendChild(s)};
  load('/site.core.js',()=>load('/product-demo.js'));
})();
