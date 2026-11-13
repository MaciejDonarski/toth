"use client"

import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@toth/ui/components/breadcrumb"

import { findNavTrail } from "./nav-config"

function AdminBreadcrumbs() {
  const t = useTranslations("nav")
  const trail = findNavTrail(usePathname())

  if (!trail) {
    return null
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          {t(`groups.${trail.group.key}`)}
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          <BreadcrumbPage>{t(`items.${trail.item.key}`)}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export { AdminBreadcrumbs }
