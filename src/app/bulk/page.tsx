'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from 'xlsx-js-style'
import { Loader2, X } from "lucide-react"
import Image from 'next/image'

// Interfaces
interface Brand {
  id: number;
  name: string;
}

interface Status {
  id: number;
  name: string;
}

interface Size {
  id: number;
  name: string;
}

interface SizeGroup {
  id: number;
  name: string;
}

interface ColumnMapping {
  [key: string]: string;
}

interface ErrorItem {
  field: string;
  error: string;
  rows: number[];
}

interface Correction {
  value: string;
  id: number;
}

interface CorrectionMap {
  [key: string]: Correction;
}

interface ErrorCorrection {
  [key: string]: CorrectionMap;
}

interface CellValue {
  value: string | number;
  error?: boolean;
  errorMessage?: string;
  id?: number;
  corrected?: boolean;
  isImage?: boolean;
  tempPath?: string;
}

interface MappedRow {
  [key: string]: CellValue;
}

interface ErrorWithIndex extends ErrorItem {
  index: number;
}

interface TableError {
  field: string;
  error: string;
  errorMessage: string;
  value: string;
  rows: number[];
}

// Definizione del tipo per la funzione debounce
type DebouncedFunction<T extends (...args: any[]) => any> = (...args: Parameters<T>) => void;

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): DebouncedFunction<T> {
  let timeout: NodeJS.Timeout | undefined;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default function BulkPage() {
  // Stati
  const [file, setFile] = useState<File | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [fileHeaders, setFileHeaders] = useState<string[]>([])
  const [previewData, setPreviewData] = useState<any[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [sizes, setSizes] = useState<Size[]>([])
  const [sizeGroups, setSizeGroups] = useState<SizeGroup[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [corrections, setCorrections] = useState<ErrorCorrection>({})
  const [appliedCorrections, setAppliedCorrections] = useState<ErrorCorrection>({})
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [suggestedMappings, setSuggestedMappings] = useState<Set<string>>(new Set())
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Attributi prodotto
  const productAttributes = [
    'article_code',
    'variant_code',
    'size',
    'size_group',
    'wholesale_price',
    'retail_price',
    'barcode',
    'photo_value'
  ]

  // Attributi obbligatori
  const requiredAttributes = [
    'article_code',
    'variant_code',
    'size',
    'size_group',
    'wholesale_price'
  ]

  // Funzione per verificare se tutti i campi obbligatori sono stati mappati
  const isPreviewEnabled = useMemo(() => {
    if (!selectedStatus) return false;
    
    // Verifica se il brand è selezionato dal database o mappato da Excel
    const hasBrand = selectedBrand || columnMapping['brand'];
    if (!hasBrand) return false;
    
    return requiredAttributes.every(attr => {
      // Se l'attributo è size o size_group, controlla anche le correzioni
      if (attr === 'size' && !columnMapping['size']) {
        return corrections['size']?.['']?.id !== undefined;
      }
      if (attr === 'size_group' && !columnMapping['size_group']) {
        return corrections['size_group']?.['']?.id !== undefined;
      }
      if (attr === 'article_code' || attr === 'variant_code' || attr === 'wholesale_price') {
        return columnMapping[attr] !== undefined;
      }
      return true;
    });
  }, [selectedBrand, selectedStatus, columnMapping, corrections]);

  // Effetti
  useEffect(() => {
    fetchData()
  }, [])

  // Imposta lo stato Active come default dopo il caricamento degli stati
  useEffect(() => {
    const activeStatus = statuses.find(s => s.name === 'Active');
    if (activeStatus) {
      setSelectedStatus(activeStatus.id.toString());
    }
  }, [statuses]);

  // Funzioni
  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [brandsResponse, statusesResponse, sizesResponse, sizeGroupsResponse] = await Promise.all([
        fetch(`${process.env.API_URL}/api/brands`, { mode: 'cors', credentials: 'include' }),
        fetch(`${process.env.API_URL}/api/statuses/field/Products`, { mode: 'cors', credentials: 'include' }),
        fetch(`${process.env.API_URL}/api/sizes`, { mode: 'cors', credentials: 'include' }),
        fetch(`${process.env.API_URL}/api/size-groups`, { mode: 'cors', credentials: 'include' })
      ])

      const [brandsData, statusesData, sizesData, sizeGroupsData] = await Promise.all([
        brandsResponse.json(),
        statusesResponse.json(),
        sizesResponse.json(),
        sizeGroupsResponse.json()
      ])

      setBrands(brandsData)
      setStatuses(statusesData)
      setSizes(sizesData)
      setSizeGroups(sizeGroupsData)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "Errore",
        description: "Errore nel caricamento dei dati iniziali. Riprova.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      readFileHeaders(selectedFile)
      setIsDialogOpen(true)
    }
  }

  // Funzione per suggerire il mapping delle colonne
  const suggestColumnMapping = (headers: string[]): ColumnMapping => {
    const suggestions: ColumnMapping = {};
    const newSuggestedMappings = new Set<string>();
    
    // Mapping di parole chiave per ogni attributo, ordinate dalla più specifica alla più generica
    const keywordMap = {
      article_code: [
        'style_number', 'article_code', 'codice_articolo', 
        'numero_stile', 'codice_prodotto', 'codice_modello',
        'style number', 'article code', 'codice articolo', 
        'numero stile', 'codice prodotto', 'codice modello',
        'article', 'articolo', 'codice', 'code', 'art', 'style', 'stile', 'modello'
      ],
      variant_code: [
        'variant_code', 'color_code', 'codice_variante', 'codice_colore',
        'variant code', 'color code', 'codice variante', 'codice colore',
        'variant', 'variante', 'color', 'colore', 'var', 'variazione', 'tonalità'
      ],
      size: [
        'size', 'taglia', 'misura', 'dimensione',
        'taglia_eu', 'taglia_it', 'taglia_uk', 'taglia_us',
        'eu_size', 'it_size', 'uk_size', 'us_size'
      ],
      size_group: [
        'size_group', 'gruppo_taglie', 'gruppo_misure',
        'size group', 'gruppo taglie', 'gruppo misure',
        'group', 'gruppo', 'categoria_taglie', 'categoria taglie',
        'famiglia_taglie', 'famiglia taglie'
      ],
      wholesale_price: [
        'wholesale_price', 'prezzo_ingrosso', 'costo_acquisto',
        'wholesale price', 'prezzo ingrosso', 'costo acquisto',
        'wholesale', 'ingrosso', 'prezzo_base', 'prezzo base',
        'costo_fornitore', 'costo fornitore'
      ],
      retail_price: [
        'retail_price', 'prezzo_retail', 'prezzo_vendita', 'prezzo_consigliato',
        'retail price', 'prezzo retail', 'prezzo vendita', 'prezzo consigliato',
        'retail', 'vendita', 'prezzo_pubblico', 'prezzo pubblico',
        'prezzo_finale', 'prezzo finale', 'prezzo_al_pubblico', 'prezzo al pubblico'
      ],
      barcode: [
        'barcode', 'sku', 'ean', 'upc', 'gtin',
        'codice_barre', 'codice_a_barre', 'codice a barre',
        'product_code', 'product code', 'codice_prodotto', 'codice prodotto',
        'codice_univoco', 'codice univoco', 'identificativo_prodotto', 'identificativo prodotto',
        'codice_ean', 'codice ean', 'codice_upc', 'codice upc',
        'numero_articolo', 'numero articolo'
      ],
      photo_value: [
        'photo_url', 'image_url', 'url_foto', 'url_immagine',
        'photo url', 'image url', 'url foto', 'url immagine',
        'link_foto', 'link_immagine', 'link foto', 'link immagine',
        'percorso_foto', 'percorso_immagine', 'percorso foto', 'percorso immagine',
        'photo', 'foto', 'image', 'immagine', 'media', 'file'
      ]
    };

    // Prima cerca corrispondenze esatte
    headers.forEach(header => {
      const headerLower = header.toLowerCase();
      
      Object.entries(keywordMap).forEach(([attribute, keywords]) => {
        // Prima controlla se c'è una corrispondenza esatta
        if (headerLower === keywords[0].toLowerCase()) {
          suggestions[attribute] = header;
          newSuggestedMappings.add(attribute);
          return;
        }
      });
    });

    // Poi cerca corrispondenze parziali per i campi non ancora mappati
    headers.forEach(header => {
      const headerLower = header.toLowerCase();
      
      Object.entries(keywordMap).forEach(([attribute, keywords]) => {
        // Salta se è già stato mappato
        if (suggestions[attribute]) return;
        
        // Cerca corrispondenze parziali
        for (const keyword of keywords) {
          if (headerLower.includes(keyword.toLowerCase())) {
            suggestions[attribute] = header;
            newSuggestedMappings.add(attribute);
            return;
          }
        }
      });
    });

    setSuggestedMappings(newSuggestedMappings);
    console.log('Mapping suggerito:', suggestions);
    return suggestions;
  };

  const readFileHeaders = (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[]
      setFileHeaders(headers)
      
      // Suggerisci automaticamente il mapping
      const suggestions = suggestColumnMapping(headers)
      console.log('Suggested mapping:', suggestions)
      setColumnMapping(suggestions)
    }
    reader.readAsArrayBuffer(file)
  }

  const handleColumnMappingChange = (attribute: string, value: string) => {
    setColumnMapping(prev => ({ ...prev, [attribute]: value }))
    setSuggestedMappings(prev => {
      const next = new Set(prev)
      next.delete(attribute)
      return next
    })
  }

  const processPrice = (price: any): number => {
    if (typeof price !== 'string' && typeof price !== 'number') {
      return 0
    }
    const cleanedPrice = String(price).replace(/[€$\s]/g, '').replace(',', '.')
    return parseFloat(cleanedPrice) || 0
  }

  const getHyperlinkFromCell = (worksheet: XLSX.WorkSheet, rowIndex: number, header: string): string | null => {
    const cellRef = header + (rowIndex + 2); // +2 perché Excel inizia da 1 e c'è l'header
    const cell = worksheet[cellRef];
    
    console.log('Analisi cella per hyperlink:', { 
      cellRef, 
      cellValue: cell?.v,
      cellType: cell?.t,
      hasHyperlink: !!cell?.l,
      hasFormula: !!cell?.f,
      hasHtml: !!cell?.h,
      rawCell: cell
    });
    
    // Controlla se la cella ha un hyperlink nella proprietà h
    if (cell?.h) {
      console.log('Trovato HTML nella cella:', cell.h);
      const match = cell.h.match(/HYPERLINK\s*"([^"]+)"/);
      if (match && match[1]) {
        console.log('Estratto URL da HTML:', match[1]);
        return match[1];
      }
    }
    
    // Se la cella ha un hyperlink diretto
    if (cell?.l?.Target) {
      console.log('Trovato hyperlink diretto:', cell.l.Target);
      return cell.l.Target;
    }
    
    // Se la cella ha un valore che inizia con http
    if (cell?.v && typeof cell.v === 'string' && cell.v.startsWith('http')) {
      console.log('Trovato URL diretto nel valore della cella:', cell.v);
      return cell.v;
    }

    // Se la cella ha una formula HYPERLINK
    if (cell?.f && typeof cell.f === 'string' && cell.f.startsWith('HYPERLINK')) {
      console.log('Trovata formula HYPERLINK:', cell.f);
      const match = cell.f.match(/HYPERLINK\s*\("([^"]+)"/);
      if (match && match[1]) {
        console.log('Estratto URL dalla formula:', match[1]);
        return match[1];
      }
    }

    // Se la cella ha un valore che contiene un URL di Fashion Cloud
    if (cell?.v && typeof cell.v === 'string' && cell.v.includes('MEDIA_')) {
      console.log('Trovato possibile ID Fashion Cloud:', cell.v);
      const fashionCloudMatch = cell.v.match(/MEDIA_.*?(?:\/|$)/);
      if (fashionCloudMatch) {
        const mediaId = fashionCloudMatch[0].replace(/\/$/, '');
        const fullUrl = `https://media.prod.showroom.fashion.cloud/${mediaId}`;
        console.log('Costruito URL Fashion Cloud:', fullUrl);
        return fullUrl;
      }
    }
    
    console.log('Nessun URL trovato nella cella. Valore grezzo:', cell?.v);
    return null;
  }

  const extractAndSaveImage = async (worksheet: XLSX.WorkSheet, rowIndex: number, header: string): Promise<string | null> => {
    const cellRef = header + (rowIndex + 2);
    const cell = worksheet[cellRef];
    
    console.log('Analisi cella per immagine:', { 
      cellRef, 
      hasImage: !!cell?._IMG,
      cellType: cell?.t,
      cellValue: cell?.v,
      rawCell: cell
    });
    
    if (!cell) {
      console.log('Cella non trovata');
      return null;
    }

    // Se la cella contiene un'immagine
    if (cell._IMG) {
      console.log('Trovata immagine incorporata nella cella');
      try {
        // Crea un blob dall'immagine base64
        const byteString = atob(cell._IMG);
        console.log('Lunghezza dati immagine:', byteString.length);
        
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: 'image/png' });
        console.log('Blob creato:', { size: blob.size, type: blob.type });
        
        // Crea un URL temporaneo per il blob
        const tempUrl = URL.createObjectURL(blob);
        console.log('URL temporaneo creato:', tempUrl);
        
        return tempUrl;
      } catch (error) {
        console.error('Errore durante l\'elaborazione dell\'immagine:', error);
        return null;
      }
    }
    
    console.log('Nessuna immagine trovata nella cella');
    return null;
  }

  const uploadToCloudflare = async (imageUrl: string): Promise<string | null> => {
    try {
      // Converti l'URL del blob in un File
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `image_${Date.now()}.png`, { type: 'image/png' });
      
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await fetch(`${process.env.API_URL}/api/products/photos/upload`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'include'
      });
      
      if (!uploadResponse.ok) throw new Error('Upload failed');
      
      const data = await uploadResponse.json();
      
      // Rimuovi l'URL temporaneo
      URL.revokeObjectURL(imageUrl);
      
      return data.url;
    } catch (error) {
      console.error('Error uploading to Cloudflare:', error);
      return null;
    }
  }

  const handlePreview = async () => {
    if (!file) return;

    try {
      console.log('Inizio lettura file con xlsx-js-style');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { 
        type: 'array', 
        cellDates: true, 
        cellFormula: true, 
        cellHTML: true 
      });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      console.log('Dati Excel letti:', { 
        sheetNames: workbook.SheetNames,
        firstSheet: workbook.SheetNames[0],
        rowCount: jsonData.length
      });
      
      const mappedDataPromises = jsonData.map(async (row: any, rowIndex: number): Promise<MappedRow | null> => {
        // Verifica se il codice articolo è presente e valido
        const articleCode = row[columnMapping['article_code']];
        if (!articleCode || articleCode === 'Total' || articleCode === '') {
          return null;
        }

        console.log(`\nProcesso riga ${rowIndex + 1}:`, { articleCode });

        const mappedRow: any = {};

        // Se il brand è mappato dal file Excel
        if (columnMapping['brand']) {
          const brandValue = row[columnMapping['brand']];
          const brandMatch = brands.find(b => b.name.toLowerCase() === String(brandValue).toLowerCase());
          if (brandMatch) {
            mappedRow.brand = { value: brandMatch.name, id: brandMatch.id };
          } else {
            mappedRow.brand = { 
              value: brandValue, 
              error: true, 
              errorMessage: `Brand non valido: ${brandValue}` 
            };
          }
        } else {
          // Usa il brand selezionato manualmente
          const selectedBrandObj = brands.find(b => b.id.toString() === selectedBrand);
          mappedRow.brand = { 
            value: selectedBrandObj?.name || '',
            id: selectedBrand ? parseInt(selectedBrand) : undefined
          };
        }

        // Gestione dello stato
        const selectedStatusObj = statuses.find(s => s.id.toString() === selectedStatus);
        mappedRow.status = { 
          value: selectedStatusObj?.name || '',
          id: selectedStatus ? parseInt(selectedStatus) : undefined
        };

        // Gestione di size e size_group dal database
        if (!columnMapping['size']) {
          const selectedSizeObj = sizes.find(s => s.id.toString() === corrections['size']?.['']?.id?.toString());
          if (selectedSizeObj) {
            mappedRow.size = { 
              value: selectedSizeObj.name,
              id: selectedSizeObj.id
            };
          }
        }

        if (!columnMapping['size_group']) {
          const selectedGroupObj = sizeGroups.find(g => g.id.toString() === corrections['size_group']?.['']?.id?.toString());
          if (selectedGroupObj) {
            mappedRow.size_group = { 
              value: selectedGroupObj.name,
              id: selectedGroupObj.id
            };
          }
        }

        for (const [attribute, header] of Object.entries(columnMapping)) {
          if (mappedRow[attribute]) continue; // Salta se già impostato (es. da database)
          
          const cellValue = row[header];
          const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 1, c: fileHeaders.indexOf(header) });
          const cell = worksheet[cellRef];
          
          console.log(`Processo attributo ${attribute}:`, { 
            header, 
            cellValue,
            cellRef,
            hasHyperlink: !!cell?.l,
            hasFormula: !!cell?.f,
            hasImage: !!cell?._IMG
          });

          if (cellValue === undefined || cellValue === null || cellValue === 'N/A') {
            mappedRow[attribute] = { value: 'N/A', error: false };
          } else if (attribute === 'size') {
            const sizeMatch = sizes.find(s => s.name.toLowerCase() === String(cellValue).toLowerCase());
            if (sizeMatch) {
              mappedRow[attribute] = { value: sizeMatch.name, id: sizeMatch.id };
            } else {
              mappedRow[attribute] = { value: cellValue, error: true, errorMessage: `Taglia non valida: ${cellValue}` };
            }
          } else if (attribute === 'size_group') {
            const groupMatch = sizeGroups.find(g => g.name.toLowerCase() === String(cellValue).toLowerCase());
            if (groupMatch) {
              mappedRow[attribute] = { value: groupMatch.name, id: groupMatch.id };
            } else {
              mappedRow[attribute] = { value: cellValue, error: true, errorMessage: `Gruppo taglie non valido: ${cellValue}` };
            }
          } else if (attribute === 'wholesale_price' || attribute === 'retail_price') {
            mappedRow[attribute] = { value: processPrice(cellValue) };
          } else if (attribute === 'photo_value') {
            console.log('\n--- Inizio elaborazione foto ---');
            
            let photoUrl = null;
            
            // 1. Controlla se la cella ha un'immagine incorporata
            if (cell?._IMG) {
              console.log('1. Trovata immagine incorporata');
              try {
                // Crea un blob dall'immagine base64
                const byteString = atob(cell._IMG);
                console.log('Lunghezza dati immagine:', byteString.length);
                
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                  ia[i] = byteString.charCodeAt(i);
                }
                const blob = new Blob([ab], { type: 'image/png' });
                console.log('Blob creato:', { size: blob.size, type: blob.type });
                
                // Crea un URL temporaneo per il blob
                photoUrl = URL.createObjectURL(blob);
                console.log('URL temporaneo creato:', photoUrl);
              } catch (error) {
                console.error('Errore durante l\'elaborazione dell\'immagine:', error);
              }
            }
            // 2. Controlla se la cella ha un hyperlink
            else if (cell?.l?.Target) {
              console.log('2. Trovato hyperlink:', cell.l.Target);
              photoUrl = cell.l.Target;
            }
            // 3. Controlla se è un URL diretto
            else if (typeof cellValue === 'string' && cellValue.toLowerCase().startsWith('http')) {
              console.log('3. Trovato URL diretto:', cellValue);
              photoUrl = cellValue;
            }
            // 4. Controlla se è una formula HYPERLINK
            else if (cell?.f && typeof cell.f === 'string' && cell.f.startsWith('HYPERLINK')) {
              console.log('4. Trovata formula HYPERLINK:', cell.f);
              const match = cell.f.match(/HYPERLINK\s*\("([^"]+)"/);
              if (match && match[1]) {
                console.log('Estratto URL dalla formula:', match[1]);
                photoUrl = match[1];
              }
            }
            // 5. Controlla se è un ID Fashion Cloud
            else if (typeof cellValue === 'string' && cellValue.includes('MEDIA_')) {
              console.log('5. Trovato possibile ID Fashion Cloud:', cellValue);
              const fashionCloudMatch = cellValue.match(/MEDIA_.*?(?:\/|$)/);
              if (fashionCloudMatch) {
                const mediaId = fashionCloudMatch[0].replace(/\/$/, '');
                photoUrl = `https://media.prod.showroom.fashion.cloud/${mediaId}`;
                console.log('Costruito URL Fashion Cloud:', photoUrl);
              }
            }

            console.log('Risultato finale elaborazione foto:', {
              photoUrl,
              isImage: !!photoUrl
            });
            console.log('--- Fine elaborazione foto ---\n');

            if (photoUrl) {
              mappedRow[attribute] = { 
                value: photoUrl,
                isImage: true
              };
            } else {
              mappedRow[attribute] = { 
                value: 'N/A',
                isImage: false
              };
            }
          } else {
            mappedRow[attribute] = { value: cellValue };
          }
        }
        return mappedRow;
      });

      const mappedData = (await Promise.all(mappedDataPromises)).filter((row): row is MappedRow => row !== null);
      console.log('Mapped Data Preview:', mappedData.map(row => ({
        articleCode: row.article_code.value,
        photoValue: row.photo_value?.value,
        isImage: row.photo_value?.isImage
      })));

      setPreviewData(mappedData);
      setIsDialogOpen(false); // Chiudi il popup dopo l'anteprima
    } catch (error) {
      console.error('Errore durante la lettura del file:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la lettura del file. Riprova.",
        variant: "destructive",
      });
    }
  };

  const handleCorrection = (field: string, errorMessage: string, value: string, id: number) => {
    setCorrections(prev => {
      const newCorrections = { ...prev }
      if (!newCorrections[field]) {
        newCorrections[field] = {}
      }
      newCorrections[field][errorMessage] = { value, id }
      return newCorrections
    })
  }

  const applyCorrections = () => {
    const updatedPreviewData = previewData.map(row => {
      const updatedRow = { ...row }
      Object.entries(corrections).forEach(([field, fieldCorrections]) => {
        Object.entries(fieldCorrections).forEach(([errorMessage, correction]) => {
          if (updatedRow[field].error && updatedRow[field].errorMessage === errorMessage) {
            updatedRow[field] = {
              ...updatedRow[field],
              value: correction.value,
              id: correction.id,
              error: false,
              corrected: true
            }
          }
        })
      })
      return updatedRow
    })
    setPreviewData(updatedPreviewData)
    setAppliedCorrections(prev => ({ ...prev, ...corrections }))
    setCorrections({})
    setIsErrorDialogOpen(false)
  }

  const handleUpload = async () => {
    setIsUploading(true)
    setUploadProgress(0)
    const results = []

    try {
      for (let i = 0; i < previewData.length; i++) {
        const row = previewData[i]
        
        // Prepara i dati del prodotto senza la foto
        const productData = {
          article_code: row.article_code.value,
          variant_code: row.variant_code.value,
          size_id: row.size.id,
          size_group_id: row.size_group.id,
          brand_id: parseInt(selectedBrand),
          wholesale_price: row.wholesale_price.value,
          retail_price: row.retail_price.value,
          status_id: parseInt(selectedStatus),
          barcode: row.barcode?.value
        }

        // Verifica se il prodotto esiste già
        const checkResponse = await fetch(`${process.env.API_URL}/api/products/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            article_code: productData.article_code,
            variant_code: productData.variant_code,
            size_id: productData.size_id,
          }),
          mode: 'cors',
          credentials: 'include',
        })

        if (!checkResponse.ok) {
          throw new Error('Errore nel controllo esistenza prodotto')
        }

        const { exists } = await checkResponse.json()

        if (exists) {
          results.push({ status: 'Duplicato', product: productData })
        } else {
          // Crea il prodotto usando la nuova API di bulk upload
          const createResponse = await fetch(`${process.env.API_URL}/api/products/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              products: [productData]
            }),
            mode: 'cors',
            credentials: 'include',
          })

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            throw new Error(errorData.error || 'Errore nella creazione del prodotto');
          }

          const responseData = await createResponse.json();
          const createdProduct = responseData.created[0];

          if (!createdProduct) {
            throw new Error('Errore nella creazione del prodotto: nessun prodotto restituito');
          }

          results.push({ status: 'Creato', product: createdProduct });
        }

        setUploadProgress(Math.round(((i + 1) / previewData.length) * 100));
      }

      // Gestione delle foto in bulk
      const photosToUpload = previewData
        .filter(row => row.photo_value?.isImage && row.photo_value.value)
        .map(row => ({
          article_code: row.article_code.value,
          variant_code: row.variant_code.value,
          url: row.photo_value.value,
          isPublicUrl: row.photo_value.value.startsWith('https://pub-')
        }));

      if (photosToUpload.length > 0) {
        try {
          const photosResponse = await fetch(`${process.env.API_URL}/api/products/bulk-photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              photos: photosToUpload,
              usePublicUrl: true 
            }),
            mode: 'cors',
            credentials: 'include'
          });

          if (!photosResponse.ok) {
            throw new Error('Errore nel caricamento delle foto');
          }

          const photosResult = await photosResponse.json();
          console.log('Risultato caricamento foto:', photosResult);
        } catch (photoError) {
          console.error('Errore nel caricamento delle foto:', photoError);
          toast({
            title: 'Attenzione',
            description: 'Prodotti creati con successo ma si sono verificati errori nel caricamento delle foto.',
            variant: 'destructive',
          });
        }
      }

      // Genera report CSV
      const csvContent = generateCSVReport(results)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', 'report_upload_prodotti.csv')
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      toast({
        title: 'Upload Completato',
        description: `${results.length} prodotti processati. Scarica il report per i dettagli.`,
      })
    } catch (error) {
      console.error('Errore upload:', error)
      toast({
        title: 'Errore Upload',
        description: 'Si è verificato un errore durante l\'upload. Riprova.',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const generateCSVReport = (results: any[]) => {
    const headers = ['Codice Articolo', 'Codice Variante', 'Taglia', 'Stato']
    const rows = results.map(result =>
      [
        result.product.article_code,
        result.product.variant_code,
        sizes.find(s => s.id === result.product.size_id)?.name || '',
        result.status
      ]
    )
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const handleCancel = () => {
    setFile(null)
    setPreviewData([])
    setCorrections({})
    setAppliedCorrections({})
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const errorRowCount = useMemo(() => {
    return previewData.filter((row: MappedRow) => 
      Object.values(row).some((cell: CellValue) => cell.error && !cell.corrected)
    ).length
  }, [previewData])

  const groupedErrors = useMemo(() => {
    return previewData.reduce((acc: Record<string, TableError>, row: MappedRow, rowIndex: number) => {
      Object.entries(row).forEach(([field, value]: [string, CellValue]) => {
        if (value.error && !value.corrected && value.errorMessage) {
          const key = `${field}-${value.errorMessage}`
          if (!acc[key]) {
            acc[key] = { 
              field, 
              error: value.errorMessage,
              errorMessage: value.errorMessage,
              value: String(value.value),
              rows: [] 
            }
          }
          acc[key].rows.push(rowIndex)
        }
      })
      return acc
    }, {} as Record<string, TableError>)
  }, [previewData])

  // Funzione per suggerire correzioni
  const getSuggestionForError = (field: string, errorValue: string): string | null => {
    if (!errorValue) return null;
    
    const normalizedValue = errorValue.toLowerCase().trim();
    
    switch (field) {
      case 'size':
        // Prima controlla se è una variante di taglia unica
        const unicaSynonyms = ['os', 'one size', 'unica', 'tu', 'taglia unica', 'u', 'onesize'];
        if (unicaSynonyms.includes(normalizedValue)) {
          return 'UNICA';
        }
        
        // Altrimenti cerca la taglia più simile
        return sizes
          .map(s => ({ name: s.name, similarity: levenshteinDistance(normalizedValue, s.name.toLowerCase()) }))
          .sort((a, b) => a.similarity - b.similarity)
          [0]?.name || null;
        
      case 'size_group':
        // Cerca il gruppo taglie più simile
        return sizeGroups
          .map(g => ({ name: g.name, similarity: levenshteinDistance(normalizedValue, g.name.toLowerCase()) }))
          .sort((a, b) => a.similarity - b.similarity)
          [0]?.name || null;
        
      case 'brand':
        // Cerca il brand più simile
        return brands
          .map(b => ({ name: b.name, similarity: levenshteinDistance(normalizedValue, b.name.toLowerCase()) }))
          .sort((a, b) => a.similarity - b.similarity)
          [0]?.name || null;
        
      default:
        return null;
    }
  };

  // Funzione per calcolare la distanza di Levenshtein (similarità tra stringhe)
  const levenshteinDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        );
      }
    }

    return matrix[b.length][a.length];
  };

  // Uso:
  const debouncedSearch = debounce((query: string) => {
    console.log('Searching for:', query);
  }, 500);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Caricamento Prodotti in Massa</h1>
      <div className="flex items-center gap-4 mb-4">
        <Input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
        />
        <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Scegli File'}
        </Button>
        {file && (
          <div className="flex items-center gap-2">
            <span>{file.name}</span>
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[900px] h-[90vh] max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold">Mappa Colonne</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Seleziona le corrispondenze tra le colonne del file Excel e i campi del prodotto
            </p>
          </DialogHeader>
          
          <div className="flex flex-1 gap-4 min-h-0">
            {/* Colonna sinistra - Brand e Stato */}
            <div className="w-1/3 space-y-4 border-r pr-4">
              <div className="space-y-2">
                <Label htmlFor="brand" className="flex items-center gap-2 text-sm font-medium">
                  Brand
                  <span className="text-xs text-red-500 font-medium">*</span>
                </Label>
                <Select 
                  onValueChange={(value) => {
                    if (value.startsWith('db_')) {
                      setSelectedBrand(value.replace('db_', ''));
                      setColumnMapping(prev => {
                        const newMapping = { ...prev };
                        delete newMapping['brand'];
                        return newMapping;
                      });
                    } else if (value === '_select') {
                      setSelectedBrand('');
                      setColumnMapping(prev => {
                        const newMapping = { ...prev };
                        delete newMapping['brand'];
                        return newMapping;
                      });
                    } else {
                      setSelectedBrand(''); // Resetta il brand selezionato dal database
                      handleColumnMappingChange('brand', value);
                    }
                  }}
                  value={selectedBrand ? `db_${selectedBrand}` : (columnMapping['brand'] || '_select')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[200px]">
                      <SelectItem value="_select" disabled>Seleziona un&apos;opzione</SelectItem>
                      <SelectItem value="_db_header" disabled className="font-semibold text-muted-foreground bg-muted">
                        Da Database
                      </SelectItem>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={`db_${brand.id}`}>{brand.name}</SelectItem>
                      ))}
                      <SelectItem value="_excel_header" disabled className="font-semibold text-muted-foreground bg-muted mt-2">
                        Da Excel
                      </SelectItem>
                      {fileHeaders.map((header) => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="flex items-center gap-2 text-sm font-medium">
                  Stato
                  <span className="text-xs text-red-500 font-medium">*</span>
                </Label>
                <Select onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[200px]">
                      {statuses.map((status) => (
                        <SelectItem key={status.id} value={status.id.toString()}>{status.name}</SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Colonna destra - Mappatura campi */}
            <div className="w-2/3 min-h-0">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-2 gap-4">
                  {productAttributes.map((attribute) => (
                    <div key={attribute} className="space-y-2">
                      <Label htmlFor={attribute} className="flex items-center gap-2 text-sm font-medium">
                        {attribute === 'photo_type' ? 'TIPO FOTO' :
                         attribute === 'photo_value' ? 'VALORE FOTO' :
                         attribute === 'barcode' ? 'BARCODE' :
                         attribute.replace('_', ' ').toUpperCase()}
                        {(attribute === 'photo_value' || attribute === 'barcode' || attribute === 'retail_price') && 
                          <span className="text-xs text-muted-foreground">(opzionale)</span>
                        }
                        {suggestedMappings.has(attribute) && (
                          <span className="text-xs text-green-500 font-medium">
                            (Suggerito)
                          </span>
                        )}
                        {requiredAttributes.includes(attribute) && (
                          <span className="text-xs text-red-500 font-medium">*</span>
                        )}
                      </Label>
                      {attribute === 'photo_type' ? (
                        <Select 
                          onValueChange={(value) => handleColumnMappingChange(attribute, value)}
                          value={columnMapping[attribute] || ''}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleziona tipo foto" />
                          </SelectTrigger>
                          <SelectContent>
                            <ScrollArea className="h-[200px]">
                              <SelectItem value="none">Non mappare</SelectItem>
                              <SelectItem value="url">URL Remoto</SelectItem>
                              <SelectItem value="file">File Excel</SelectItem>
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                      ) : attribute === 'size' ? (
                        <Select 
                          onValueChange={(value) => {
                            if (value.startsWith('db_')) {
                              const sizeId = value.replace('db_', '');
                              const selectedSize = sizes.find(s => s.id.toString() === sizeId);
                              if (selectedSize) {
                                handleCorrection('size', '', selectedSize.name, selectedSize.id);
                              }
                              setColumnMapping(prev => {
                                const newMapping = { ...prev };
                                delete newMapping['size'];
                                return newMapping;
                              });
                            } else {
                              handleColumnMappingChange('size', value);
                            }
                          }}
                          value={columnMapping['size'] || ''}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleziona taglia" />
                          </SelectTrigger>
                          <SelectContent>
                            <ScrollArea className="h-[200px]">
                              <SelectItem value="_select" disabled>Seleziona un&apos;opzione</SelectItem>
                              <SelectItem value="_db_header" disabled className="font-semibold text-muted-foreground bg-muted">
                                Da Database
                              </SelectItem>
                              {sizes.map((size) => (
                                <SelectItem key={size.id} value={`db_${size.id}`}>{size.name}</SelectItem>
                              ))}
                              <SelectItem value="_excel_header" disabled className="font-semibold text-muted-foreground bg-muted mt-2">
                                Da Excel
                              </SelectItem>
                              {fileHeaders.map((header) => (
                                <SelectItem key={header} value={header}>{header}</SelectItem>
                              ))}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                      ) : attribute === 'size_group' ? (
                        <Select 
                          onValueChange={(value) => {
                            if (value.startsWith('db_')) {
                              const groupId = value.replace('db_', '');
                              const selectedGroup = sizeGroups.find(g => g.id.toString() === groupId);
                              if (selectedGroup) {
                                handleCorrection('size_group', '', selectedGroup.name, selectedGroup.id);
                              }
                              setColumnMapping(prev => {
                                const newMapping = { ...prev };
                                delete newMapping['size_group'];
                                return newMapping;
                              });
                            } else {
                              handleColumnMappingChange('size_group', value);
                            }
                          }}
                          value={columnMapping['size_group'] || ''}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleziona gruppo taglie" />
                          </SelectTrigger>
                          <SelectContent>
                            <ScrollArea className="h-[200px]">
                              <SelectItem value="_select" disabled>Seleziona un&apos;opzione</SelectItem>
                              <SelectItem value="_db_header" disabled className="font-semibold text-muted-foreground bg-muted">
                                Da Database
                              </SelectItem>
                              {sizeGroups.map((group) => (
                                <SelectItem key={group.id} value={`db_${group.id}`}>{group.name}</SelectItem>
                              ))}
                              <SelectItem value="_excel_header" disabled className="font-semibold text-muted-foreground bg-muted mt-2">
                                Da Excel
                              </SelectItem>
                              {fileHeaders.map((header) => (
                                <SelectItem key={header} value={header}>{header}</SelectItem>
                              ))}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select 
                          onValueChange={(value) => handleColumnMappingChange(attribute, value)}
                          value={columnMapping[attribute] || ''}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={`Seleziona ${attribute.replace('_', ' ')}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <ScrollArea className="h-[200px]">
                              {(attribute === 'photo_value' || attribute === 'barcode') && (
                                <SelectItem value="none">Non mappare</SelectItem>
                              )}
                              {fileHeaders.map((header) => (
                                <SelectItem key={header} value={header}>{header}</SelectItem>
                              ))}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="border-t pt-4 mt-4">
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annulla</Button>
              <Button onClick={handlePreview} disabled={!isPreviewEnabled}>
                {!isPreviewEnabled ? 'Completa i campi obbligatori' : 'Anteprima'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {previewData.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Anteprima</h2>
            <div className="flex items-center gap-4">
              <span>{errorRowCount} righe con errori trovate</span>
              {errorRowCount > 0 && (
                <Button onClick={() => setIsErrorDialogOpen(true)}>
                  Gestisci Errori
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>BRAND</TableHead>
                  <TableHead>STATO</TableHead>
                  <TableHead>ARTICLE CODE</TableHead>
                  <TableHead>VARIANT CODE</TableHead>
                  <TableHead>FOTO</TableHead>
                  <TableHead>SIZE</TableHead>
                  <TableHead>SIZE GROUP</TableHead>
                  <TableHead>BARCODE</TableHead>
                  <TableHead>WHOLESALE PRICE</TableHead>
                  <TableHead>RETAIL PRICE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {row.brand?.value}
                      {row.brand?.error && (
                        <span className="text-red-500 ml-1">
                          ({row.brand.errorMessage})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{row.status?.value}</TableCell>
                    <TableCell className={row.article_code?.error ? 'text-red-500' : ''}>
                      {row.article_code?.value}
                    </TableCell>
                    <TableCell className={row.variant_code?.error ? 'text-red-500' : ''}>
                      {row.variant_code?.value}
                    </TableCell>
                    <TableCell>
                      {row.photo_value?.isImage ? (
                        <div className="relative w-10 h-10">
                          <Image 
                            src={row.photo_value.value} 
                            alt="Product preview"
                            width={100}
                            height={100}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <span>N/A</span>
                      )}
                    </TableCell>
                    <TableCell className={row.size?.error ? 'text-red-500' : ''}>
                      {row.size?.value}
                    </TableCell>
                    <TableCell className={row.size_group?.error ? 'text-red-500' : ''}>
                      {row.size_group?.value}
                    </TableCell>
                    <TableCell className={row.barcode?.error ? 'text-red-500' : ''}>
                      {row.barcode?.value}
                    </TableCell>
                    <TableCell className={row.wholesale_price?.error ? 'text-red-500' : ''}>
                      {row.wholesale_price?.value}
                    </TableCell>
                    <TableCell className={row.retail_price?.error ? 'text-red-500' : ''}>
                      {row.retail_price?.value}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <div className="mt-4 flex justify-end space-x-4">
            <Button variant="outline" onClick={handleCancel}>Annulla</Button>
            <Button 
              onClick={handleUpload} 
              disabled={isUploading || errorRowCount > 0}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Caricamento {uploadProgress}%
                </>
              ) : (
                'Carica'
              )}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Gestione Errori</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Correggi gli errori trovati nei dati. I valori suggeriti sono basati sui dati esistenti.
            </p>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CAMPO</TableHead>
                  <TableHead>ERRORE</TableHead>
                  <TableHead>RIGHE</TableHead>
                  <TableHead>CORREZIONE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values<TableError>(groupedErrors).map((error: TableError, index) => {
                  const suggestion = getSuggestionForError(error.field, error.error.replace(/[^a-zA-Z0-9]/g, ' '));
                  const hasCorrection = corrections[error.field]?.[error.errorMessage] || appliedCorrections[error.field]?.[error.errorMessage];
                  
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{error.field.toUpperCase()}</TableCell>
                      <TableCell>{error.error}</TableCell>
                      <TableCell>{error.rows.length}</TableCell>
                      <TableCell>
                        {error.field === 'size' ? (
                          <Select 
                            onValueChange={(value) => {
                              const selectedSize = sizes.find(s => s.name === value)
                              if (selectedSize) {
                                handleCorrection(error.field, error.errorMessage, selectedSize.name, selectedSize.id)
                              }
                            }}
                            value={corrections[error.field]?.[error.errorMessage]?.value || appliedCorrections[error.field]?.[error.errorMessage]?.value}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleziona taglia" />
                            </SelectTrigger>
                            <SelectContent>
                              <ScrollArea className="h-[200px]">
                                {suggestion && !hasCorrection && (
                                  <SelectItem value={suggestion} className="bg-muted font-medium">
                                    Suggerito: {suggestion}
                                  </SelectItem>
                                )}
                                {sizes.map((size) => (
                                  <SelectItem key={size.id} value={size.name}>{size.name}</SelectItem>
                                ))}
                              </ScrollArea>
                            </SelectContent>
                          </Select>
                        ) : error.field === 'size_group' ? (
                          <Select 
                            onValueChange={(value) => {
                              const selectedGroup = sizeGroups.find(g => g.name === value)
                              if (selectedGroup) {
                                handleCorrection(error.field, error.errorMessage, selectedGroup.name, selectedGroup.id)
                              }
                            }}
                            value={corrections[error.field]?.[error.errorMessage]?.value || appliedCorrections[error.field]?.[error.errorMessage]?.value}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleziona gruppo taglie" />
                            </SelectTrigger>
                            <SelectContent>
                              <ScrollArea className="h-[200px]">
                                {suggestion && !hasCorrection && (
                                  <SelectItem value={suggestion} className="bg-muted font-medium">
                                    Suggerito: {suggestion}
                                  </SelectItem>
                                )}
                                {sizeGroups.map((group) => (
                                  <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                                ))}
                              </ScrollArea>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="space-y-2">
                            <Input
                              value={corrections[error.field]?.[error.errorMessage]?.value || appliedCorrections[error.field]?.[error.errorMessage]?.value || ''}
                              onChange={(e) => handleCorrection(error.field, error.errorMessage, e.target.value, -1)}
                              placeholder={suggestion ? `Suggerito: ${suggestion}` : "Inserisci correzione"}
                              className={suggestion && !hasCorrection ? "border-green-500" : ""}
                            />
                            {suggestion && !hasCorrection && (
                              <p className="text-xs text-green-600">
                                Suggerimento trovato: {suggestion}
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsErrorDialogOpen(false)}>Annulla</Button>
            <Button onClick={applyCorrections}>Applica Correzioni</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
