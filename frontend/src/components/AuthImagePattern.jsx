import { useEffect, useState, useMemo } from "react";

const AuthImagePattern = ({ title, subtitle }) => {
  const [rotation, setRotation] = useState(0);
  
  // Auto-rotate effect
  useEffect(() => {
    const rotationInterval = setInterval(() => {
      setRotation(prev => (prev + 1) % 360);
    }, 50);
    
    return () => clearInterval(rotationInterval);
  }, []);

  // Generate random circuit pattern positions
  const circuitDots = useMemo(() => {
    return Array(20).fill().map(() => ({
      size: Math.random() * 4 + 2,
      top: Math.random() * 100,
      left: Math.random() * 100,
      duration: Math.random() * 4 + 2,
      delay: Math.random() * 2
    }));
  }, []);

  return (
    <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-base-300 to-base-200 p-4 md:p-8 lg:p-12 overflow-hidden">
      <div className="max-w-md text-center relative">
        {/* Backdrop tech circle */}
        <div 
          className="absolute inset-0 rounded-full border-4 border-dashed border-primary/30"
          style={{ 
            transform: `rotate(${rotation * 0.5}deg)`,
            width: "130%",
            height: "130%",
            left: "-15%",
            top: "-15%",
            zIndex: 0
          }}
        />
        
        {/* Secondary rotating element */}
        <div 
          className="absolute inset-0 rounded-full border-2 border-primary/20"
          style={{ 
            transform: `rotate(${-rotation * 0.3}deg)`,
            width: "110%",
            height: "110%",
            left: "-5%",
            top: "-5%",
            zIndex: 0
          }}
        />
        
        {/* Central 3D cube grid */}
        <div className="relative z-10 mb-16 perspective-1000">
          <div 
            className="grid grid-cols-3 grid-rows-3 gap-3 transform-style-3d"
            style={{ 
              transform: `rotateY(${rotation * 0.2}deg) rotateX(${Math.sin(rotation * 0.01) * 10}deg)`,
              transition: "transform 0.1s ease-out"
            }}
          >
            {[...Array(9)].map((_, i) => {
              // Calculate position-based delays and effects
              const row = Math.floor(i / 3);
              const col = i % 3;
              const isCenter = row === 1 && col === 1;
              const distance = Math.sqrt(Math.pow(row-1, 2) + Math.pow(col-1, 2));
              const pulseDelay = distance * 0.5;
              const depth = isCenter ? 25 : distance * 12;
              
              return (
                <div
                  key={i}
                  className={`
                    aspect-square rounded-xl relative overflow-hidden
                    ${isCenter ? "bg-primary" : "bg-primary/10"}
                    ${i % 2 === 0 ? "animate-pulse" : ""}
                  `}
                  style={{ 
                    animationDelay: `${pulseDelay}s`,
                    transform: `translateZ(${depth}px)`,
                    boxShadow: `0 0 ${isCenter ? 15 : 5}px ${isCenter ? "rgba(var(--p), 0.7)" : "rgba(var(--p), 0.3)"}`,
                  }}
                >
                  {/* Circuit patterns inside each cell */}
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-1/4 left-0 w-full h-[1px] bg-primary-content"></div>
                    <div className="absolute top-3/4 left-0 w-full h-[1px] bg-primary-content"></div>
                    <div className="absolute left-1/4 top-0 h-full w-[1px] bg-primary-content"></div>
                    <div className="absolute left-3/4 top-0 h-full w-[1px] bg-primary-content"></div>
                    {(i === 4 || i % 3 === 0) && (
                      <div 
                        className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-primary-content transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                          animation: "circuit-pulse 1.5s infinite",
                          animationDelay: `${i * 0.2}s`
                        }}
                      ></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Pulsing ring around content */}
        <div className="absolute inset-0 rounded-3xl border-2 border-primary/20 animate-ping" 
          style={{ animationDuration: "3s" }}></div>
        
        {/* Horizontal lines with animated dots that move from left to right */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          {[0.2, 0.4, 0.6, 0.8].map((pos, i) => (
            <div key={`line-${i}`} className="absolute w-full h-[1px] bg-primary/20" style={{ top: `${pos * 100}%` }}>
              <div 
                className="absolute w-2 h-2 bg-primary rounded-full" 
                style={{ 
                  animation: `moveRight ${3 + i}s linear infinite`,
                  animationDelay: `${i * 0.5}s`
                }}
              ></div>
            </div>
          ))}
        </div>
        
        {/* Text with futuristic styling */}
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary tracking-wide">{title}</h2>
          <p className="text-base-content/60 relative">
            <span className="relative px-6">
              {subtitle}
              <span className="absolute -left-6 top-1/2 w-4 h-[1px] bg-primary"></span>
              <span className="absolute -right-6 top-1/2 w-4 h-[1px] bg-primary"></span>
            </span>
          </p>
        </div>
        
        {/* Circuit nodes */}
        {circuitDots.map((dot, i) => (
          <div
            key={`circuit-${i}`}
            className="absolute bg-primary rounded-full"
            style={{
              width: `${dot.size}px`,
              height: `${dot.size}px`,
              top: `${dot.top}%`,
              left: `${dot.left}%`,
              opacity: 0.4,
              animation: `circuit-pulse ${dot.duration}s infinite`,
              animationDelay: `${dot.delay}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AuthImagePattern;