/** Privacy-safe DOM-lite: bookmarklet extracts Polaris banners on the Shopify tab; user pastes here. */

export const BOOKMARKLET = `javascript:(function(){try{const q=['[class*="Banner"]','[class*="banner"]','[role="alert"]','[class*="Toast"]','[class*="toast"]','[class*="InlineError"]','[class*="Validation"]','.Polaris-Banner','.Polaris-Toast'];const seen=new Set();const nodes=[];for(const s of q){document.querySelectorAll(s).forEach(el=>{if(seen.has(el))return;seen.add(el);const t=(el.innerText||'').trim();if(t.length<3||t.length>800)return;const cls=el.className&&el.className.toString?el.className.toString():'';const tone=/critical|error|destructive|negative/i.test(cls+' '+t)?'critical':/warning|caution|attention/i.test(cls+' '+t)?'warning':'info';nodes.push({tone,text:t.slice(0,500),role:el.getAttribute('role')||'',cls:cls.slice(0,120)});});}const payload={v:1,src:'storescope-domlite',path:location.pathname,title:document.title,host:location.hostname.replace(/\\.myshopify\\.com.*/,'.myshopify.com'),banners:nodes.slice(0,12)};navigator.clipboard.writeText('STORESCOPE_DOM:'+JSON.stringify(payload)).then(()=>alert('Storescope DOM-lite copied. Paste it into Storescope.')).catch(()=>{prompt('Copy this into Storescope', 'STORESCOPE_DOM:'+JSON.stringify(payload));});}catch(e){alert('DOM-lite failed: '+e.message);}})();`;

export function parseDomLite(raw) {
  const text = (raw || "").trim();
  const idx = text.indexOf("STORESCOPE_DOM:");
  if (idx === -1) return null;
  try {
    const json = text.slice(idx + "STORESCOPE_DOM:".length);
    const data = JSON.parse(json);
    if (!data || data.v < 1) return null;
    return {
      path: data.path || "",
      title: data.title || "",
      banners: Array.isArray(data.banners) ? data.banners : [],
      host: data.host || ""
    };
  } catch {
    return null;
  }
}

export function domLiteQuery(parsed) {
  if (!parsed) return "";
  const bits = [parsed.title, parsed.path, ...(parsed.banners || []).map((b) => b.text)];
  return bits.filter(Boolean).join("\n");
}

export function mergeSignals({ ocrText, bannerText, toastText, dom, typed }) {
  const parts = [];
  if (typed) parts.push(typed);
  if (dom) parts.push(domLiteQuery(dom));
  if (bannerText) parts.push(bannerText);
  if (toastText) parts.push(toastText);
  if (ocrText) parts.push(ocrText);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out.join("\n");
}
