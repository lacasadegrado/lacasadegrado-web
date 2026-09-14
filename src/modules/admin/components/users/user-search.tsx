"use client"

import { Search } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { Button } from "@/common/components/ui/button"
import { Input } from "@/common/components/ui/input"

import { ADMIN_PATHS } from "../../lib/constants/admin.constants"

export function UserSearch() {
  const router = useRouter()
  const params = useSearchParams()
  const [value, setValue] = useState(params.get("q") ?? "")

  return (
    <form
      role="search"
      className="flex max-w-md gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const q = value.trim()
        router.push(q ? `${ADMIN_PATHS.users}?q=${encodeURIComponent(q)}` : ADMIN_PATHS.users)
      }}
    >
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Buscar por correo, nombre o rol"
        aria-label="Buscar personas"
      />
      <Button type="submit" variant="outline" aria-label="Buscar">
        <Search aria-hidden="true" />
      </Button>
    </form>
  )
}
