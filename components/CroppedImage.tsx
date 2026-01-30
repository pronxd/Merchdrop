interface CropData {
  x: number;
  y: number;
  scale: number;
  canvasSize: number;
}

interface CroppedImageProps {
  src: string;
  alt: string;
  cropData?: CropData;
  className?: string;
}

export default function CroppedImage({
  src,
  alt,
  cropData,
  className = ''
}: CroppedImageProps) {
  if (!cropData) {
    // No crop data, show image normally
    return <img src={src} alt={alt} className={className} />;
  }

  // Apply crop using CSS transform
  const { x, y, scale } = cropData;

  return (
    <div className={`${className} overflow-hidden relative`}>
      <img
        src={src}
        alt={alt}
        style={{
          position: 'absolute',
          top: `${y}px`,
          left: `${x}px`,
          width: 'auto',
          height: 'auto',
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      />
    </div>
  );
}
