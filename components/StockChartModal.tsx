"use client";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import StockEventChart from "./StockEventChart";

interface StockChartModalProps {
  code: string;
  name: string;
  onClose: () => void;
}

export default function StockChartModal({ code, name, onClose }: StockChartModalProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader eyebrow="일봉 · 왼쪽으로 스크롤하면 최근 1년까지 볼 수 있어요">
          {name}
        </DialogHeader>
        <DialogBody>
          <StockEventChart code={code} name={name} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
