
import React from 'react';

const Spinner: React.FC<{ size?: string }> = ({ size = 'w-6 h-6' }) => {
  return (
    <div className={`animate-spin rounded-full border-4 border-brand-light border-t-brand-accent ${size}`} role="status">
      <span className="sr-only">Đang tải...</span>
    </div>
  );
};

export default Spinner;
