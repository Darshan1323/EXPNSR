"use client";

import { useRef, useEffect, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import { scanReceipt } from "@/actions/transaction";

// Helper: Convert File to Base64 in the browser
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result.split(",")[1]; // remove `data:image/...;base64,`
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export function ReceiptScanner({ onScanComplete }) {
  const fileInputRef = useRef(null);
  const [scannedOnce, setScannedOnce] = useState(false); // 🛑 new

  const {
    loading: scanReceiptLoading,
    fn: scanReceiptFn,
    data: scannedData,
  } = useFetch(scanReceipt);

  const handleReceiptScan = async (file) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      return;
    }

    try {
      toast("Scanning receipt...");
      const base64 = await fileToBase64(file);
      await scanReceiptFn(base64);
    } catch (err) {
      console.error("Scan error:", err);
      toast.error("Failed to scan receipt");
    }
  };

  useEffect(() => {
    if (!scannedOnce && scannedData && !scanReceiptLoading && onScanComplete) {
      setScannedOnce(true);
      onScanComplete(scannedData);
    }
  }, [scannedData, scanReceiptLoading, scannedOnce, onScanComplete]);

  return (
    <div className="flex items-center gap-4">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleReceiptScan(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={scanReceiptLoading}
        className="w-full h-10 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 animate-gradient hover:opacity-90 transition-opacity text-white hover:text-white"
      >
        {scanReceiptLoading ? (
          <>
            <Loader2 className="mr-2 animate-spin" />
            Scanning Receipt...
          </>
        ) : (
          <>
            <Camera className="mr-2" />
            Scan Receipt with AI
          </>
        )}
      </Button>
    </div>
  );
}
