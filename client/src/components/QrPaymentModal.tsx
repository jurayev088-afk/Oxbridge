import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, ScanLine, X } from 'lucide-react';
import { fetchStudentsList } from '../api/client';
import {
  ONLINE_PAYMENT_LINKS,
  buildStudentProfileUrl,
  parseStudentIdFromQrValue,
} from '../config/paymentConfig';
import type { StudentListItem } from '../types';

type QrTab = 'scan' | 'online' | 'student';

interface QrPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onStudentSelected: (studentId: string) => void;
}

export function QrPaymentModal({ open, onClose, onStudentSelected }: QrPaymentModalProps) {
  const [tab, setTab] = useState<QrTab>('scan');
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerStarted = useRef(false);

  const stopScanner = useCallback(() => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner || !scannerStarted.current) return;

    scannerStarted.current = false;
    scanner
      .stop()
      .then(() => scanner.clear())
      .catch(() => {
        // ignore cleanup errors
      });
  }, []);

  useEffect(() => {
    if (!open) return;
    setTab('scan');
    setScanError('');
    setSelectedStudentId('');
    fetchStudentsList().then(setStudents).catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open || tab !== 'scan') {
      stopScanner();
      return;
    }

    let cancelled = false;

    async function startScanner() {
      setScanError('');
      setScanning(true);

      try {
        const scanner = new Html5Qrcode('qr-scanner-region');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            const studentId = parseStudentIdFromQrValue(decodedText);
            if (studentId) {
              stopScanner();
              onStudentSelected(studentId);
            } else {
              setScanError('O\'quvchi QR kodi topilmadi. Boshqa kodni skaner qiling.');
            }
          },
          () => {
            // ignore scan miss frames
          }
        );

        if (!cancelled) scannerStarted.current = true;
      } catch {
        if (!cancelled) {
          setScanError('Kamerani ochib bo\'lmadi. Ruxsat bering yoki qo\'lda tanlang.');
        }
      } finally {
        if (!cancelled) setScanning(false);
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [open, tab, onStudentSelected, stopScanner]);

  function handleClose() {
    stopScanner();
    onClose();
  }

  if (!open) return null;

  const studentQrValue = selectedStudentId ? buildStudentProfileUrl(selectedStudentId) : '';
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-card qr-payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="payment-modal-title">
            <QrCode size={20} />
            <h2 className="modal-title">QR to&apos;lov</h2>
          </div>
          <button type="button" className="modal-close" onClick={handleClose} aria-label="Yopish">
            <X size={18} />
          </button>
        </div>

        <div className="qr-tabs">
          <button
            type="button"
            className={`qr-tab ${tab === 'scan' ? 'active' : ''}`}
            onClick={() => setTab('scan')}
          >
            <ScanLine size={15} />
            Skaner
          </button>
          <button
            type="button"
            className={`qr-tab ${tab === 'online' ? 'active' : ''}`}
            onClick={() => setTab('online')}
          >
            Onlayn
          </button>
          <button
            type="button"
            className={`qr-tab ${tab === 'student' ? 'active' : ''}`}
            onClick={() => setTab('student')}
          >
            O&apos;quvchi QR
          </button>
        </div>

        {tab === 'scan' && (
          <div className="qr-tab-panel">
            <p className="qr-panel-hint">
              O&apos;quvchi kartasidagi QR kodni skaner qiling — to&apos;lov oynasi ochiladi.
            </p>
            <div id="qr-scanner-region" className="qr-scanner-region" />
            {scanning && <p className="qr-panel-hint">Kamera ochilmoqda...</p>}
            {scanError && <p className="modal-error">{scanError}</p>}
          </div>
        )}

        {tab === 'online' && (
          <div className="qr-tab-panel">
            <p className="qr-panel-hint">Ota-onalar uchun onlayn to&apos;lov QR kodlari</p>
            <div className="qr-online-grid">
              <div className="qr-online-card">
                <QRCodeSVG value={ONLINE_PAYMENT_LINKS.payme} size={148} bgColor="#ffffff" fgColor="#0f172a" />
                <strong>Payme</strong>
                <span>Telefon orqali to&apos;lash</span>
              </div>
              <div className="qr-online-card">
                <QRCodeSVG value={ONLINE_PAYMENT_LINKS.click} size={148} bgColor="#ffffff" fgColor="#0f172a" />
                <strong>Click</strong>
                <span>Telefon orqali to&apos;lash</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'student' && (
          <div className="qr-tab-panel">
            <label className="modal-field modal-field-full">
              <span>O&apos;quvchi</span>
              <select
                className="edit-input"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                <option value="">Tanlang...</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                    {student.groupName ? ` — ${student.groupName}` : ''}
                  </option>
                ))}
              </select>
            </label>

            {selectedStudent && studentQrValue ? (
              <div className="qr-student-preview">
                <QRCodeSVG value={studentQrValue} size={180} bgColor="#ffffff" fgColor="#0f172a" />
                <div>
                  <strong>{selectedStudent.name}</strong>
                  <p>{studentQrValue}</p>
                  <button
                    type="button"
                    className="btn-primary qr-open-payment-btn"
                    onClick={() => onStudentSelected(selectedStudent.id)}
                  >
                    To&apos;lov qilish
                  </button>
                </div>
              </div>
            ) : (
              <p className="qr-panel-hint">O&apos;quvchini tanlang — uning shaxsiy QR kodi chiqadi.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
