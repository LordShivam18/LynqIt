import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ThumbsUp, Shield, MessageCircle } from 'lucide-react';
import BlockUserButton from '../components/BlockUserButton';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';

const ReportThanksPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { reportedUser } = location.state || {};

  // If there's no reported user in state, redirect to home
  if (!reportedUser) {
    navigate('/');
    return null;
  }

  const handleContinueChat = () => {
    navigate(`/chat/${reportedUser._id}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="bg-base-100 rounded-lg shadow-lg max-w-md w-full p-6">
        <div className="flex justify-center mb-6">
          <div className="bg-success/20 p-4 rounded-full">
            <ThumbsUp className="w-10 h-10 text-success" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-2">
          Thanks for reporting
        </h1>
        
        <p className="text-base-content/70 text-center mb-6">
          We've received your report about @{reportedUser.username}. Our team will review it as soon as possible.
        </p>

        <div className="divider">What would you like to do next?</div>

        <div className="space-y-4">
          <div className="bg-base-200 p-4 rounded-lg">
            <BlockUserButton
              userId={reportedUser._id}
              username={reportedUser.username}
              isBlocked={false}
              className="w-full btn btn-error gap-2 justify-start"
              asDiv={false}
              showConfirmation={false}
              onBlockToggle={() => {
                // After blocking, stay on this page, but show a success message
                toast.success(`@${reportedUser.username} has been blocked`);
              }}
            >
              <Shield className="w-5 h-5" />
              Block @{reportedUser.username}
            </BlockUserButton>
          </div>

          <button 
            onClick={handleContinueChat}
            className="btn btn-outline w-full gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Continue chatting
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportThanksPage; 