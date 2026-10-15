import React, { useState } from 'react';
import { X, Send, MessageSquare, Headphones, ExternalLink, CheckCircle2 } from 'lucide-react';
import { SUPPORT_CONTACT } from '../data/constants.ts';
import { useStore } from '../hooks/useStore.ts';
import { store } from '../services/store.ts';
import { SupportTicket } from '../types.ts';

interface CustomerSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerSupportModal: React.FC<CustomerSupportModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, supportTickets } = useStore();

  const [category, setCategory] = useState<SupportTicket['category']>('question');
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contact' | 'ticket' | 'my_tickets'>('contact');

  if (!isOpen || !currentUser) return null;

  const userTickets = supportTickets.filter((t) => t.userId === currentUser.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!message.trim()) {
      setFeedback('Please enter your message or query.');
      return;
    }

    const res = store.submitSupportTicket({
      userId: currentUser.id,
      category,
      message,
    });

    if (res.success) {
      setFeedback(res.message);
      setMessage('');
      setTimeout(() => {
        setActiveTab('my_tickets');
      }, 1200);
    } else {
      setFeedback(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-display font-bold text-base text-white">
                Customer Support & Assistance
              </h3>
              <span className="text-[10px] text-blue-200">
                24/7 Mining Operations Desk
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab('contact')}
            className={`py-2.5 text-center transition-colors border-b-2 ${
              activeTab === 'contact'
                ? 'border-blue-600 text-blue-600 bg-white font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Telegram Support
          </button>
          <button
            onClick={() => setActiveTab('ticket')}
            className={`py-2.5 text-center transition-colors border-b-2 ${
              activeTab === 'ticket'
                ? 'border-blue-600 text-blue-600 bg-white font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            New Ticket
          </button>
          <button
            onClick={() => setActiveTab('my_tickets')}
            className={`py-2.5 text-center transition-colors border-b-2 relative ${
              activeTab === 'my_tickets'
                ? 'border-blue-600 text-blue-600 bg-white font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            My Tickets ({userTickets.length})
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-center space-y-2">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                  <Headphones className="w-6 h-6" />
                </div>
                <h4 className="font-display font-bold text-slate-900 text-sm">
                  Official Diamond Mine Africa Support
                </h4>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Our operations team is available around the clock via official Telegram handles for recharge inquiries, technical support, and account assistance.
                </p>
              </div>

              {/* Telegram Support Channels */}
              <div className="space-y-2">
                <a
                  href={`https://t.me/${SUPPORT_CONTACT.telegramHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50/40 flex items-center justify-between gap-3 group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold">
                      TG
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">
                        Direct Telegram Support
                      </span>
                      <span className="text-[11px] text-blue-600 font-medium">
                        {SUPPORT_CONTACT.telegramHandle}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                </a>

                <a
                  href={SUPPORT_CONTACT.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50/40 flex items-center justify-between gap-3 group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                      CH
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">
                        Official Mining Community Channel
                      </span>
                      <span className="text-[11px] text-blue-600 font-medium">
                        t.me/diamondmineafrica
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                </a>
              </div>
            </div>
          )}

          {activeTab === 'ticket' && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Query Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="question">General Question</option>
                  <option value="payment">Recharge or Withdrawal Inquiry</option>
                  <option value="product">VIP Gemstone Product Query</option>
                  <option value="technical">Technical Support</option>
                  <option value="feedback">Feedback & Suggestions</option>
                  <option value="complaints">Official Complaint</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Your Message / Query *
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your inquiry with transaction reference numbers or account questions..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              {feedback && (
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-800 font-medium text-xs border border-blue-200">
                  {feedback}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Ticket</span>
              </button>
            </form>
          )}

          {activeTab === 'my_tickets' && (
            <div className="space-y-2.5">
              {userTickets.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>You have no submitted support tickets yet.</p>
                </div>
              ) : (
                userTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        #{t.id} · {t.category.toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === 'Resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <p className="text-slate-600 text-[11px]">{t.message}</p>

                    {t.adminResponse && (
                      <div className="mt-2 p-2.5 rounded-lg bg-blue-50 border border-blue-100 text-[11px] space-y-1">
                        <span className="font-bold text-blue-900 block">
                          Response from Administration:
                        </span>
                        <p className="text-blue-800">{t.adminResponse}</p>
                      </div>
                    )}

                    <span className="text-[10px] text-slate-400 block">
                      Submitted: {new Date(t.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
