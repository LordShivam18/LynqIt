import React, { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';

const ReportMessageButton = ({ 
  messageId, 
  onReport,
  className = ""
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const reportReasons = [
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'hate_speech', label: 'Hate Speech' },
    { value: 'violence', label: 'Violence' },
    { value: 'inappropriate_content', label: 'Inappropriate Content' },
    { value: 'impersonation', label: 'Impersonation' },
    { value: 'scam', label: 'Scam' },
    { value: 'other', label: 'Other' }
  ];

  const handleReport = async () => {
    if (!reason) {
      toast.error('Please select a reason for reporting');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.post('/users/report', {
        messageId,
        reason,
        description: description.trim()
      });
      
      toast.success('Message reported successfully');
      setShowModal(false);
      setReason('');
      setDescription('');
      
      if (onReport) {
        onReport(messageId, reason);
      }
    } catch (error) {
      console.error('Error reporting message:', error);
      toast.error(error.response?.data?.error || 'Failed to report message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setReason('');
    setDescription('');
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`btn btn-ghost btn-sm gap-2 text-error hover:text-error ${className}`}
        title="Report Message"
      >
        <Flag size={16} />
        <span className="hidden sm:inline">Report</span>
      </button>

      {/* Report Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-base-100 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Report Message</h3>
              <button
                onClick={handleCancel}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Reason for reporting *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="">Select a reason</option>
                  {reportReasons.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Additional details (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide more context about why you're reporting this message..."
                  className="textarea textarea-bordered w-full h-24 resize-none"
                  maxLength={500}
                />
                <div className="text-xs text-base-content/60 mt-1">
                  {description.length}/500 characters
                </div>
              </div>

              <div className="bg-base-200 p-3 rounded-lg">
                <p className="text-xs text-base-content/70">
                  Reports are reviewed by our moderation team. False reports may result in action against your account.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCancel}
                className="btn btn-ghost flex-1"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={isLoading || !reason}
                className="btn btn-error flex-1"
              >
                {isLoading ? 'Reporting...' : 'Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportMessageButton;
