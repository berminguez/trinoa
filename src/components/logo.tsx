import Image from 'next/image'
export function Logo() {
  return (
    <div className='flex items-center gap-2'>
      <Image src='/logo.webp' alt='Trinoa' width={250} height={100} />
    </div>
  )
}
