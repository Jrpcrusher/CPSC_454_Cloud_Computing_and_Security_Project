/**
 * ProtectedImage
 * Renders a portfolio image with three layers of theft deterrence:
 *  1. Blocks right-click "Save Image As" and drag-and-drop
 *  2. Overlays a repeating semi-transparent watermark with the creator's name
 *  3. Renders at reduced CSS quality (blur + low resolution cap) so the
 *     preview isn't worth stealing even if someone screenshots it
 *
 * NOTE: No frontend protection is 100% foolproof — a determined person can
 * always take a screenshot. The goal is to make casual theft not worth it
 * and to make watermarked previews useless for reuse.
 */

function block(e) {
  e.preventDefault();
  return false;
}

export default function ProtectedImage({ src, alt, creatorName, className }) {
  return (
    <div className="protected-img-wrap">
      {/* The actual image — capped at low resolution via CSS */}
      <img
        src={src}
        alt={alt}
        className={`protected-img ${className ?? ""}`}
        draggable="false"
        onContextMenu={block}
        onDragStart={block}
        onMouseDown={block}
      />

      {/* Transparent overlay — intercepts right-click / drag on the image area */}
      <div
        className="protected-img-shield"
        onContextMenu={block}
        onDragStart={block}
        aria-hidden="true"
      />

      {/* Repeating diagonal watermark */}
      <div className="protected-img-watermark" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="watermark-text">
            {creatorName}
          </span>
        ))}
      </div>
    </div>
  );
}
