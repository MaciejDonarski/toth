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

import { findNavTrail, isActiveHref } from "./nav-config"

function AdminBreadcrumbs() {
  const t = useTranslations("nav")
  const pathname = usePathname()
  const trail = findNavTrail(pathname)

  // Pages outside the sidebar (reached from the user menu): title only.
  if (!trail) {
    return isActiveHref(pathname, "/profile") ? (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{t("pages.profile")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ) : null
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
