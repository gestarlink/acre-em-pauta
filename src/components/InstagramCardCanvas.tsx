import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import logoPortal from "@/assets/logo-header.png";

export type CardFormat = "feed" | "story" | "square" | "reels";

export const FORMAT_SIZES: Record<CardFormat, { w: number; h: number; label: string }> = {
  feed:   { w: 1080, h: 1350, label: "Feed 1080×1350" },
  story:  { w: 1080, h: 1920, label: "Story 1080×1920" },
  square: { w: 1080, h: 1080, label: "Quadrado 1080×1080" },
  reels:  { w: 1080, h: 1920, label: "Capa Reels 1080×1920" },
};

/** Paleta por categoria (slug). */
/**
 * Paleta dominante por categoria. `bg` é a cor que predomina nos detalhes do card.
 * `fg` é a cor do texto SOBRE essa cor.
 */
export const CATEGORY_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  politica:  { bg: "#0e7a3a", fg: "#ffffff", label: "Política" },     // verde
  policia:   { bg: "#c01818", fg: "#ffffff", label: "Polícia" },      // vermelho
  plantao:   { bg: "#c01818", fg: "#ffffff", label: "Plantão" },      // vermelho
  economia:  { bg: "#e2b324", fg: "#1a1a1a", label: "Economia" },     // amarelo
  esportes:  { bg: "#16a34a", fg: "#ffffff", label: "Esportes" },
  esporte:   { bg: "#16a34a", fg: "#ffffff", label: "Esportes" },
  cidades:   { bg: "#7a4a25", fg: "#ffffff", label: "Cidades" },
  cultura:   { bg: "#6d28d9", fg: "#ffffff", label: "Cultura" },
  amazonia:  { bg: "#1f5132", fg: "#ffffff", label: "Amazônia" },
};

const DEFAULT_COLORS = { bg: "#1f5132", fg: "#ffffff", label: "Notícia" };

/** Converte hex → rgba string. */
function rgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function colorsForCategory(slug?: string | null) {
  if (!slug) return DEFAULT_COLORS;
  return CATEGORY_COLORS[slug.toLowerCase()] ?? DEFAULT_COLORS;
}

export type CardProps = {
  format: CardFormat;
  imageUrl?: string | null;
  headline: string;
  categorySlug?: string | null;
  categoryLabel?: string;
  publishedAt?: string | null;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Quebra texto em linhas respeitando largura máxima. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function formatDate(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export type InstagramCardCanvasHandle = {
  download: (filename?: string) => void;
  redraw: () => Promise<void>;
};

export const InstagramCardCanvas = forwardRef<InstagramCardCanvasHandle, CardProps>(function InstagramCardCanvas(
  { format, imageUrl, headline, categorySlug, categoryLabel, publishedAt },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { w, h } = FORMAT_SIZES[format];
  const colors = colorsForCategory(categorySlug);
  const catLabel = (categoryLabel ?? colors.label).toUpperCase();

  async function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Layout — proporções por formato.
    const isTall = format === "story" || format === "reels";
    const isSquare = format === "square";
    const padX = 72;

    // Altura do painel inferior colorido (predomina a cor da categoria).
    const panelH = isTall ? Math.round(h * 0.42) : isSquare ? Math.round(h * 0.40) : Math.round(h * 0.42);
    const topBarH = 14;        // faixa colorida no topo
    const headerH = 150;       // header (badge + logo) sobre a imagem
    const imageY = topBarH;
    const imageH = h - panelH - topBarH;

    // 1) Fundo base = cor da categoria (vira o painel inferior).
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);

    // 2) Imagem cobre o topo (cover + crop center). Se faltar, gradiente da cor.
    if (imageUrl) {
      try {
        const img = await loadImage(imageUrl);
        const targetRatio = w / imageH;
        const ir = img.width / img.height;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (ir > targetRatio) { sw = img.height * targetRatio; sx = (img.width - sw) / 2; }
        else { sh = img.width / targetRatio; sy = (img.height - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, imageY, w, imageH);
      } catch {
        const g = ctx.createLinearGradient(0, imageY, 0, imageY + imageH);
        g.addColorStop(0, rgba(colors.bg, 0.6));
        g.addColorStop(1, rgba(colors.bg, 1));
        ctx.fillStyle = g;
        ctx.fillRect(0, imageY, w, imageH);
      }
    } else {
      const g = ctx.createLinearGradient(0, imageY, 0, imageY + imageH);
      g.addColorStop(0, "#1a1a1a");
      g.addColorStop(1, rgba(colors.bg, 0.85));
      ctx.fillStyle = g;
      ctx.fillRect(0, imageY, w, imageH);
    }

    // 3) Vinheta superior para legibilidade do header.
    const topGrad = ctx.createLinearGradient(0, imageY, 0, imageY + headerH + 40);
    topGrad.addColorStop(0, "rgba(0,0,0,0.55)");
    topGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, imageY, w, headerH + 40);

    // 4) Transição suave da imagem para o painel colorido.
    const fadeH = 120;
    const fade = ctx.createLinearGradient(0, h - panelH - fadeH, 0, h - panelH);
    fade.addColorStop(0, rgba(colors.bg, 0));
    fade.addColorStop(1, rgba(colors.bg, 1));
    ctx.fillStyle = fade;
    ctx.fillRect(0, h - panelH - fadeH, w, fadeH);

    // 5) Faixa colorida no topo (categoria) + faixa dourada fina.
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, topBarH);
    ctx.fillStyle = "#e2b324";
    ctx.fillRect(0, topBarH, w, 3);

    // 6) Badge de categoria (topo esquerdo) — sólida na cor inversa (clara) com texto na cor da categoria.
    ctx.font = "800 30px Inter, Arial, sans-serif";
    const badgeText = catLabel;
    const badgePadX = 26;
    const badgeW = ctx.measureText(badgeText).width + badgePadX * 2;
    const badgeH = 62;
    const badgeY = topBarH + 50;
    roundRect(ctx, padX, badgeY, badgeW, badgeH, 10);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    // Pequeno ponto na cor da categoria à esquerda do texto.
    ctx.beginPath();
    ctx.arc(padX + 22, badgeY + badgeH / 2, 8, 0, Math.PI * 2);
    ctx.fillStyle = colors.bg;
    ctx.fill();
    ctx.fillStyle = "#111111";
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, padX + badgePadX + 22, badgeY + badgeH / 2 + 2);

    // 7) Logo do portal (topo direito) sobre pílula branca para garantir contraste.
    try {
      const logo = await loadImage(logoPortal);
      const logoH = 78;
      const logoW = (logo.width / logo.height) * logoH;
      const pillPad = 14;
      const pillW = logoW + pillPad * 2;
      const pillH = logoH + pillPad * 2;
      const pillX = w - padX - pillW;
      const pillY = topBarH + 42;
      roundRect(ctx, pillX, pillY, pillW, pillH, 14);
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.fill();
      ctx.drawImage(logo, pillX + pillPad, pillY + pillPad, logoW, logoH);
    } catch { /* segue */ }

    // 8) Painel inferior colorido com headline.
    const panelY = h - panelH;

    // Linha dourada de acento no topo do painel.
    ctx.fillStyle = "#e2b324";
    ctx.fillRect(0, panelY, w, 5);

    // Marca d'agua decorativa (barra vertical dourada à esquerda do título).
    const accentX = padX;
    const accentY = panelY + 60;
    const accentH = Math.min(panelH - 200, 240);
    ctx.fillStyle = "#e2b324";
    ctx.fillRect(accentX, accentY, 6, accentH);

    // Headline.
    const titleX = padX + 28;
    const titleMaxW = w - titleX - padX;
    let fontSize = headline.length > 90 ? 64 : headline.length > 60 ? 76 : headline.length > 35 ? 88 : 100;
    ctx.font = `900 ${fontSize}px "Playfair Display", Georgia, serif`;
    ctx.fillStyle = colors.fg;
    let lines = wrapLines(ctx, headline, titleMaxW);
    if (lines.length > 5) {
      fontSize = 58;
      ctx.font = `900 ${fontSize}px "Playfair Display", Georgia, serif`;
      lines = wrapLines(ctx, headline, titleMaxW);
    }
    const lineH = fontSize * 1.1;
    const titleY = panelY + 80;
    ctx.textBaseline = "alphabetic";
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], titleX, titleY + (i + 1) * lineH * 0.92);
    }

    // 9) Rodapé do painel: data + CTA.
    const footerY = h - 70;
    ctx.font = "600 26px Inter, Arial, sans-serif";
    ctx.fillStyle = rgba(colors.fg === "#ffffff" ? "#ffffff" : "#1a1a1a", 0.78);
    ctx.textBaseline = "alphabetic";
    ctx.fillText(formatDate(publishedAt), padX, footerY);

    ctx.font = "800 28px Inter, Arial, sans-serif";
    const cta = "acreempauta.com";
    const ctaW = ctx.measureText(cta).width;
    ctx.fillStyle = colors.fg;
    ctx.fillText(cta, w - padX - ctaW, footerY);

    // 10) Borda dourada inferior fina.
    ctx.fillStyle = "#e2b324";
    ctx.fillRect(0, h - 10, w, 10);
  }

  useEffect(() => {
    void draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, imageUrl, headline, categorySlug, publishedAt]);

  useImperativeHandle(ref, () => ({
    redraw: () => draw(),
    download: (filename = `acre-em-pauta-${format}.png`) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e) {
        alert("Não foi possível exportar a imagem. Verifique se a imagem de fundo permite CORS.");
      }
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      className="block h-auto w-full rounded-lg border border-border bg-black"
      style={{ aspectRatio: `${w}/${h}` }}
    />
  );
});

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}