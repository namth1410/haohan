import React, { useState, useRef, useEffect } from "react";
import { PlayCircleOutlined, FileImageOutlined } from "@ant-design/icons";

interface LazyThumbnailProps {
  src: string;
  alt: string;
  isVideo: boolean;
  isActive: boolean;
  onClick: () => void;
}

const LazyThumbnail: React.FC<LazyThumbnailProps> = ({
  src,
  alt,
  isVideo,
  isActive,
  onClick,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const thumbnailRef = useRef<HTMLDivElement>(null);

  // Use Intersection Observer to detect visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Once visible, we can disconnect the observer
            observer.disconnect();
          }
        });
      },
      {
        root: null, // viewport
        rootMargin: "100px", // Start loading 100px before visible
        threshold: 0.1,
      }
    );

    if (thumbnailRef.current) {
      observer.observe(thumbnailRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div
      ref={thumbnailRef}
      className={`thumbnail-item ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      {isVideo ? (
        <div className="thumbnail-video">
          <PlayCircleOutlined />
        </div>
      ) : (
        <>
          {/* Placeholder shown while loading */}
          {!isLoaded && (
            <div className="thumbnail-placeholder">
              <FileImageOutlined />
            </div>
          )}

          {/* Only render image if visible in viewport */}
          {isVisible && !hasError && (
            <img
              src={src}
              alt={alt}
              className={`thumbnail-image ${isLoaded ? "loaded" : "loading"}`}
              onLoad={handleLoad}
              onError={handleError}
              loading="lazy"
            />
          )}

          {/* Error state */}
          {hasError && (
            <div className="thumbnail-error">
              <FileImageOutlined />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LazyThumbnail;
