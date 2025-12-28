"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import * as legacyApi from '../../src/lib/api'
import { Alert, AlertTitle, AlertDescription } from './ui/alert'

export default function CompleteDetailsNotice() {
  const [visible, setVisible] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let mounted = true

    const check = async () => {
      try {
        const res: any = await legacyApi.apiGetProfile()
        const p = res?.profile || res?.data || res
        if (!mounted) return

        // If user not logged in or no profile, don't show
        if (!p || !(p.user_id || p.userId || p.id)) {
          setChecked(true)
          return
        }

        // Check only `payments` and `contact_details` columns per request.
        // Treat a column as present if its JSONB value is non-empty (any keys).
        const rawPayments = p.payments
        const rawContact = p.contact_details

        const parseMaybe = (v: any) => {
          if (!v) return null
          if (typeof v === 'string') {
            try {
              return JSON.parse(v)
            } catch {
              return null
            }
          }
          return v
        }

        const payments = parseMaybe(rawPayments)
        const contact = parseMaybe(rawContact)

        const hasPayments = payments && typeof payments === 'object' && Object.keys(payments).length > 0
        const hasContact = contact && typeof contact === 'object' && Object.keys(contact).length > 0

        if (!hasPayments || !hasContact) {
          setVisible(true)
        }
      } catch (e) {
        // ignore – probably not logged in
      } finally {
        setChecked(true)
      }
    }

    check()
    return () => {
      mounted = false
    }
  }, [])

  if (!checked || !visible) return null

  return (
    <div className="complete-details-notice fixed top-0 left-0 right-0 z-50 bg-white border-b border-amber-200 shadow-md">
      {/* <div className="max-w-6xl mx-auto px-4 py-4">
        <Alert className="mb-0" variant="warning">
          <AlertTitle>Complete personal details</AlertTitle>
          <AlertDescription>
            To continue the process we need your bank, HMO and address information to fill Social Security Form 7801.{' '}
            <Link href="/payment-details" className="font-semibold underline ml-1">Complete details now</Link>
          </AlertDescription>
        </Alert>
      </div> */}
    </div>
  )
}
