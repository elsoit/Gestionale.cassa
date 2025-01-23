import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X } from 'lucide-react';
import Image from 'next/image';

interface PhotoManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articleCode: string;
  variantCode: string;
}

const PhotoManagementDialog: React.FC<PhotoManagementDialogProps> = ({
  open,
  onOpenChange,
  articleCode,
  variantCode
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Gestione Foto</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-4 mt-4">
          {/* Placeholder per le foto */}
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
            <Camera className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Carica foto
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoManagementDialog; 