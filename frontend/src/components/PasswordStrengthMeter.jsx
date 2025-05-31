import { useEffect, useState } from 'react';
import { Check, X, Shield, ShieldAlert, ShieldCheck, AlertCircle } from 'lucide-react';

const PasswordStrengthMeter = ({ password, criteria }) => {
  const [strength, setStrength] = useState(0);
  const [strengthLabel, setStrengthLabel] = useState('');
  const [strengthColor, setStrengthColor] = useState('');
  const [icon, setIcon] = useState(null);

  // Calculate password strength based on criteria
  useEffect(() => {
    if (!password) {
      setStrength(0);
      setStrengthLabel('');
      setStrengthColor('');
      setIcon(<Shield size={18} className="text-base-content/30" />);
      return;
    }

    // Count how many criteria are met
    const validCriteriaCount = criteria.filter(c => c.valid).length;
    const percentage = (validCriteriaCount / criteria.length) * 100;
    
    // Set strength based on percentage
    setStrength(percentage);
    
    // Set label and color based on strength
    if (percentage === 0) {
      setStrengthLabel('Empty');
      setStrengthColor('#9CA3AF'); // Gray
      setIcon(<Shield size={18} className="text-base-content/30" />);
    } else if (percentage < 40) {
      setStrengthLabel('Weak');
      setStrengthColor('#EF4444'); // Red
      setIcon(<ShieldAlert size={18} className="text-error" />);
    } else if (percentage < 80) {
      setStrengthLabel('Medium');
      setStrengthColor('#F59E0B'); // Amber
      setIcon(<ShieldAlert size={18} className="text-warning" />);
    } else if (percentage < 100) {
      setStrengthLabel('Strong');
      setStrengthColor('#10B981'); // Green
      setIcon(<ShieldCheck size={18} className="text-success" />);
    } else {
      setStrengthLabel('Very Strong');
      setStrengthColor('#059669'); // Darker Green
      setIcon(<ShieldCheck size={18} className="text-success" />);
    }
  }, [password, criteria]);

  return (
    <div className="space-y-4 mt-2 animate-fadeIn">
      {/* Strength meter */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {icon}
            <span className="text-xs font-medium">Password Strength: </span>
            <span 
              className="text-xs font-semibold" 
              style={{ color: strengthColor }}
            >
              {strengthLabel}
            </span>
          </div>
          <span className="text-xs font-medium">{Math.round(strength)}%</span>
        </div>
        
        {/* Progress bar with segments */}
        <div className="h-1.5 w-full bg-base-300 rounded-full overflow-hidden flex">
          {[0, 1, 2, 3, 4].map((segment) => {
            const segmentThreshold = (segment + 1) * 20;
            const isActive = strength >= segmentThreshold;
            let segmentColor = strengthColor;
            
            // Fade out non-active segments
            if (!isActive) {
              segmentColor = 'transparent';
            }
            
            return (
              <div
                key={segment}
                className="h-full transition-all duration-300 ease-in-out"
                style={{ 
                  width: '20%',
                  backgroundColor: segmentColor,
                  marginRight: segment < 4 ? '1px' : '0',
                  borderRadius: '1px',
                  transform: isActive ? 'scaleY(1)' : 'scaleY(0.5)',
                  opacity: isActive ? 1 : 0.3,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="bg-base-200/50 backdrop-blur-sm p-4 rounded-lg border border-base-300">
        <h4 className="text-xs font-semibold mb-3 flex items-center gap-2">
          <AlertCircle size={14} />
          Password Requirements
        </h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
          {criteria.map((criterion, index) => (
            <li 
              key={index} 
              className={`flex items-center gap-2 text-xs transition-all duration-300 ease-in-out ${
                criterion.valid ? 'text-success' : 'text-base-content/70'
              }`}
            >
              {criterion.valid ? (
                <div className="bg-success/10 p-0.5 rounded-full">
                  <Check size={12} className="text-success" />
                </div>
              ) : (
                <div className="bg-base-300 p-0.5 rounded-full">
                  <X size={12} className="text-base-content/40" />
                </div>
              )}
              <span>{criterion.text || criterion.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PasswordStrengthMeter; 