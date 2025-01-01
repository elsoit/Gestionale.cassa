'use server'

import { Size, SizeGroup } from '@/types/product'

export async function verifyProductData(productData: any[]) {
  // Fetch sizes and size groups from the database
  const sizes = await fetchSizes()
  const sizeGroups = await fetchSizeGroups()

  return productData.map(product => {
    const verifiedProduct = { ...product }

    if (product.size) {
      const sizeMatch = compareWithDatabase(product.size, sizes)
      verifiedProduct.size = {
        value: product.size,
        dbName: sizeMatch.dbName,
        match: sizeMatch.match
      }
    }

    if (product.size_group) {
      const sizeGroupMatch = compareWithDatabase(product.size_group, sizeGroups)
      verifiedProduct.size_group = {
        value: product.size_group,
        dbName: sizeGroupMatch.dbName,
        match: sizeGroupMatch.match
      }
    }

    return verifiedProduct
  })
}

async function fetchSizes(): Promise<Size[]> {
  // Implement database fetch for sizes
  const response = await fetch('http://localhost:3003/api/sizes')
  return response.json()
}

async function fetchSizeGroups(): Promise<SizeGroup[]> {
  // Implement database fetch for size groups
  const response = await fetch('http://localhost:3003/api/size-groups')
  return response.json()
}

function compareWithDatabase(value: string, dbItems: Size[] | SizeGroup[]) {
  const match = dbItems.find(item => item.name.toLowerCase() === value.toLowerCase())
  return {
    match: !!match,
    dbName: match ? match.name : '',
    dbId: match ? match.id : null
  }
}