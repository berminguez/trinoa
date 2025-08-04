import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function ApiKeysSkeleton() {
  return (
    <div className='flex-1 space-y-6 p-4 pt-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='space-y-1'>
          <Skeleton className='h-8 w-32' />
          <Skeleton className='h-4 w-80' />
        </div>
        <Skeleton className='h-10 w-36' />
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <Skeleton className='h-6 w-24' />
            <Skeleton className='h-4 w-16' />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Skeleton className='h-4 w-16' />
                </TableHead>
                <TableHead>
                  <Skeleton className='h-4 w-20' />
                </TableHead>
                <TableHead>
                  <Skeleton className='h-4 w-20' />
                </TableHead>
                <TableHead>
                  <Skeleton className='h-4 w-16' />
                </TableHead>
                <TableHead>
                  <Skeleton className='h-4 w-20' />
                </TableHead>
                <TableHead>
                  <Skeleton className='h-4 w-16' />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Skeleton rows */}
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className='h-4 w-32' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-4 w-24' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-4 w-28' />
                  </TableCell>
                  <TableCell>
                    <div className='font-mono'>
                      <Skeleton className='h-4 w-40' />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className='flex flex-wrap gap-1'>
                      <Skeleton className='h-5 w-16' />
                      <Skeleton className='h-5 w-20' />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      <Skeleton className='h-8 w-8' />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Empty state skeleton (when no keys) */}
      <Card className='border-dashed'>
        <CardContent className='flex flex-col items-center justify-center py-12'>
          <Skeleton className='h-12 w-12 rounded-full mb-4' />
          <Skeleton className='h-6 w-48 mb-2' />
          <Skeleton className='h-4 w-64' />
        </CardContent>
      </Card>
    </div>
  )
}
