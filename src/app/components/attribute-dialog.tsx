import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

interface AttributeDialogProps {
  parameterId: number
  parameterName: string
  open: boolean
  onClose: () => void
}

export function AttributeDialog({ parameterId, parameterName, open, onClose }: AttributeDialogProps) {
  const [newAttributeName, setNewAttributeName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch attributes
  const { data: attributes = [], isLoading } = useQuery({
    queryKey: ['attributes', parameterId],
    queryFn: async () => {
      const response = await fetch(`http://localhost:3003/api/attributes/parameter/${parameterId}`)
      if (!response.ok) throw new Error('Failed to fetch attributes')
      return response.json()
    },
    enabled: open
  })

  // Create attribute
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('http://localhost:3003/api/attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parameter_id: parameterId, name })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create attribute')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributes', parameterId] })
      setNewAttributeName('')
      toast({
        title: "Success",
        description: "Attribute created successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  })

  // Update attribute
  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number, name: string }) => {
      const response = await fetch(`http://localhost:3003/api/attributes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update attribute')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributes', parameterId] })
      setEditingId(null)
      setEditingName('')
      toast({
        title: "Success",
        description: "Attribute updated successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  })

  // Delete attribute
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`http://localhost:3003/api/attributes/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete attribute')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributes', parameterId] })
      toast({
        title: "Success",
        description: "Attribute deleted successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  })

  const handleCreate = () => {
    if (!newAttributeName.trim()) return
    createMutation.mutate(newAttributeName)
  }

  const startEditing = (attribute: any) => {
    setEditingId(attribute.id)
    setEditingName(attribute.name)
  }

  const handleUpdate = () => {
    if (!editingId || !editingName.trim()) return
    updateMutation.mutate({ id: editingId, name: editingName })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingName('')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Attributes for {parameterName}</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="New attribute name"
            value={newAttributeName}
            onChange={(e) => setNewAttributeName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : attributes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center">No attributes found</TableCell>
                </TableRow>
              ) : (
                attributes.map((attribute: any) => (
                  <TableRow key={attribute.id}>
                    <TableCell>
                      {editingId === attribute.id ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleUpdate()}
                          className="max-w-[200px]"
                        />
                      ) : (
                        attribute.name
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {editingId === attribute.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleUpdate}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={cancelEditing}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditing(attribute)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(attribute.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
