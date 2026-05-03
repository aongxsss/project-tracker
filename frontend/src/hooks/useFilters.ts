import { useState, useEffect, useRef } from "react"
import { Project, ConfigItem } from "../types"

export function useFilters(allBrands: ConfigItem[]) {
  const [activeBrands, setActiveBrands] = useState<string[] | null>(null)
  const prevNamesRef = useRef<string[]>([])

  useEffect(() => {
    const newNames = allBrands.map((b) => b.name)
    const prevNames = prevNamesRef.current

    if (activeBrands === null && newNames.length > 0) {
      setActiveBrands(newNames)
    } else if (activeBrands !== null) {
      const added = newNames.filter((n) => !prevNames.includes(n))
      const removed = prevNames.filter((n) => !newNames.includes(n))
      if (added.length > 0 || removed.length > 0) {
        setActiveBrands((prev) =>
          prev === null ? newNames : [...prev.filter((b) => !removed.includes(b)), ...added]
        )
      }
    }

    prevNamesRef.current = newNames
  }, [allBrands]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleBrand = (brand: string) => {
    setActiveBrands((prev) =>
      prev === null
        ? prev
        : prev.includes(brand)
        ? prev.filter((b) => b !== brand)
        : [...prev, brand]
    )
  }

  const filteredProjects = (projects: Project[]): Project[] => {
    if (activeBrands === null) return projects
    return projects.filter((p) => activeBrands.includes(p.brand))
  }

  return { activeBrands: activeBrands ?? [], toggleBrand, filteredProjects }
}
