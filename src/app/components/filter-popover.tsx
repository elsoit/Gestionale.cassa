import React from 'react';
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FilterPopoverProps {
  parameter: {
    id: number;
    name: string;
    attributes: Array<{
      id: number;
      name: string;
    }>;
  };
  selectedValues: number[];
  onChange: (values: number[]) => void;
}

export function FilterPopover({ parameter, selectedValues, onChange }: FilterPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredAttributes = parameter.attributes.filter(attr => 
    attr.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleValue = (value: number) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between min-w-[200px]"
        >
          <span className="truncate">
            {parameter.name}
            {selectedValues.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedValues.length}
              </Badge>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="p-2">
          <Input
            placeholder={`Cerca in ${parameter.name}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-2"
          />
          <ScrollArea className="h-[300px] pr-4">
            {filteredAttributes.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">
                Nessun risultato trovato.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredAttributes.map((attr) => (
                  <label
                    key={attr.id}
                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedValues.includes(attr.id)}
                      onCheckedChange={() => toggleValue(attr.id)}
                    />
                    <span className="text-sm">{attr.name}</span>
                  </label>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
