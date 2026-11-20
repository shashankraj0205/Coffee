import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { X, QrCode, Printer, CheckCircle2, Sparkles } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useModalEffects } from '../utils/useModalEffects';
import { SOLEN_EASE } from './MotionPrimitives';

interface QrMenuModalProps {
  open: boolean;
  onClose: () => void;
}

const TABLES = ['Digital Menu', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];

export const QrMenuModal: React.FC<QrMenuModalProps> = ({ open, onClose }) => {
  const { store, tableNumberFromQr, setTableNumberFromQr } = useStore();
  const [selectedTable, setSelectedTable] = useState(tableNumberFromQr || 'T4');
  const [qrDataUrl, setQrDataUrl] = useState('');

  useModalEffects(open, onClose);

  const origin =
    typeof window !== 'undefined' && window.location.origin.startsWith('http')
      ? window.location.origin
      : 'https://kulhadkaapi.in';
  const targetUrl =
    selectedTable === 'Digital Menu'
      ? `${origin}/#menu`
      : `${origin}/?table=${encodeURIComponent(selectedTable)}#menu`;

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(targetUrl, {
      width: 260,
      margin: 2,
      color: { dark: '#3B2418', light: '#FFF9F0' },
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [open, targetUrl]);

  const handlePrintTent = () => {
    const w = window.open('', '_blank', 'width=460,height=640');
    if (!w) return;
    w.document.write(`<!doctype html><html><body style="font-family:sans-serif;text-align:center;padding:36px;background:#FFF9F0;color:#3B2418;">
      <div style="border:2px solid #D9A441;border-radius:20px;padding:28px;max-width:340px;margin:0 auto;background:#fff;">
        <h2 style="margin:0;">${store.brand.name}</h2>
        <p style="color:#6F4028;margin:4px 0 16px;">चाय · कॉफी — Scan to Order</p>
        <img src="${qrDataUrl}" style="width:220px;height:220px;" />
        <p style="font-weight:700;font-size:18px;margin:14px 0 4px;">${selectedTable === 'Digital Menu' ? 'Digital Chai & Coffee Menu' : `Table ${selectedTable} Express Order`}</p>
        <p style="font-size:12px;color:#6F4028;">Order hot Kulhad Chai & Filter Coffee straight to your table!</p>
      </div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 250);
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="QR Digital Menu & Table Ordering"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1E120C]/75 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25, ease: SOLEN_EASE }}
            className="relative z-10 w-full max-w-md rounded-3xl bg-white text-[#15241E] border border-[#144734]/15 shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-[#144734] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#E68A24]" />
                <div>
                  <h3 className="font-serif text-lg font-semibold">
                    QR Digital Menu &amp; Table Order
                  </h3>
                  <p className="text-[11px] text-[#F5EBDD]/70">
                    Scan from any café table for instant chai &amp; kaapi service
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-center">
              <div className="flex flex-wrap justify-center gap-1.5">
                {TABLES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTable(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-all ${
                      selectedTable === t
                        ? 'bg-[#3B2418] text-[#FFF9F0] border-[#3B2418]'
                        : 'bg-[#F5EBDD] text-[#6F4028] border-[#6F4028]/15 hover:border-[#E68A24]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="inline-block p-4 rounded-3xl bg-white border-2 border-[#D9A441]/45 shadow-md">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR code for ${selectedTable}`}
                    className="w-52 h-52 mx-auto"
                  />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-xs text-[#6F4028]">
                    Generating QR...
                  </div>
                )}
                <p className="font-mono text-[11px] text-[#6F4028] mt-2 truncate max-w-[220px]">
                  {selectedTable === 'Digital Menu'
                    ? 'General Digital Menu'
                    : `Table ${selectedTable} Direct Order`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedTable !== 'Digital Menu') {
                      setTableNumberFromQr(selectedTable);
                    }
                    onClose();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-full bg-[#E68A24] hover:bg-[#D9A441] text-[#3B2418] text-xs font-bold cursor-pointer"
                >
                  {selectedTable !== 'Digital Menu' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Order for {selectedTable}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Browse Menu</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handlePrintTent}
                  className="inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-full bg-[#3B2418] hover:bg-[#6F4028] text-[#FFF9F0] text-xs font-semibold cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-[#D9A441]" />
                  <span>Print Table Tent</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
