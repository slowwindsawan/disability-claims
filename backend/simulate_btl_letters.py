#!/usr/bin/env python3
"""
BTL Letter Pipeline Simulator
==============================
Simulates 7 BTL letters arriving at different times to test the complete pipeline:
  PDF upload → Vision OCR → LLM analysis → btl_action_agent → DB write

Each letter carries a distinct trigger type so you can verify every branch of the agent.

Usage:
    python simulate_btl_letters.py --case-id <UUID> [OPTIONS]

Required:
    --case-id   UUID of an existing case in your DB

Optional:
    --user-id   UUID of the case owner (backend falls back to case owner if omitted)
    --base-url  Backend URL               (default: http://localhost:8000)
    --delay     Seconds between letters   (default: 5)
    --dry-run   Print payloads, do NOT send requests
    --only      Comma-separated letter IDs to send, e.g. --only 1,3,5

Examples:
    python simulate_btl_letters.py --case-id abc-123 --delay 10
    python simulate_btl_letters.py --case-id abc-123 --only 1 --dry-run
"""

import argparse
import base64
import json
import sys
import time
import textwrap
from datetime import datetime

try:
    import requests as _requests
except ImportError:
    _requests = None  # handled below


# ── Colour helpers ─────────────────────────────────────────────────────────────
RESET  = "\033[0m"
BOLD   = "\033[1m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
GREY   = "\033[90m"

def c(text, colour): return f"{colour}{text}{RESET}"


# ── PDF builder ────────────────────────────────────────────────────────────────
def make_pdf_bytes(lines: list) -> bytes:
    """Return a valid PDF containing the given lines.  Requires fpdf2."""
    try:
        from fpdf import FPDF  # pip install fpdf2
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", size=11)
        for line in lines:
            # fpdf2 does not support RTL or Hebrew glyphs with the built-in font,
            # so we write content in English that mirrors what real letters say.
            safe = line.encode("latin-1", errors="replace").decode("latin-1")
            pdf.multi_cell(0, 8, safe)
        return bytes(pdf.output())
    except ImportError:
        print(c("  [!] fpdf2 not installed — using raw text bytes instead (OCR may extract less)", YELLOW))
        print(c("      Run:  pip install fpdf2   to get proper PDF output", YELLOW))
        return "\n".join(lines).encode("utf-8")


# ── 7 letter definitions ───────────────────────────────────────────────────────
#  delay_before = seconds to wait BEFORE sending this letter
LETTERS = [
    {
        "id": 1,
        "expected_trigger": "claim_approved",
        "delay_before": 0,          # first letter sent immediately
        "file_name": "disability_approval.pdf",
        "meta": {
            "date": "2026-02-10",
            "row_text": "Decision: disability claim approved",
            "index": 0,
            "category": "decisions",
            "title": "Approval Letter - Disability",
        },
        "content": [
            "NATIONAL INSURANCE INSTITUTE OF ISRAEL",
            "Date: February 10, 2026",
            "Subject: Decision on Disability Claim",
            "",
            "Dear Applicant,",
            "We are pleased to inform you that after review by the Medical Committee,",
            "your disability claim has been APPROVED.",
            "",
            "Disability percentage: 40%",
            "Monthly benefit amount: 2,500 ILS",
            "Effective from: January 1, 2026",
            "",
            "Approved benefits:",
            "  - Monthly disability allowance",
            "  - Tuition assistance eligibility",
            "",
            "Registered email on file: applicant@example.com",
            "Department note: Approved 40% disability effective January 2026.",
            "",
            "Yours faithfully,",
            "National Insurance Institute - Medical Department",
        ],
    },
    {
        "id": 2,
        "expected_trigger": "waiting_for_docs",
        "delay_before": 5,
        "file_name": "documents_required.pdf",
        "meta": {
            "date": "2026-02-12",
            "row_text": "Request for additional supporting documents",
            "index": 1,
            "category": "requests",
            "title": "Missing Documents Notice",
        },
        "content": [
            "NATIONAL INSURANCE INSTITUTE OF ISRAEL",
            "Date: February 12, 2026",
            "Subject: Additional Documents Required to Process Your Claim",
            "",
            "Dear Applicant,",
            "To continue processing your claim, please submit the following documents:",
            "",
            "  1. Full medical records from your treating physician",
            "  2. Hospital discharge summary (2024)",
            "  3. Specialist report - Orthopedics",
            "  4. Income verification documents (last 3 months)",
            "",
            "Documents must be submitted within 30 days of this notice.",
            "Failure to submit may result in processing delays or claim closure.",
            "",
            "National Insurance Institute - Claims Processing Department",
        ],
    },
    {
        "id": 3,
        "expected_trigger": "appointment_scheduled",
        "delay_before": 5,
        "file_name": "committee_appointment.pdf",
        "meta": {
            "date": "2026-02-15",
            "row_text": "Medical committee appointment scheduled",
            "index": 2,
            "category": "appointments",
            "title": "Appointment Notice - Medical Committee",
        },
        "content": [
            "NATIONAL INSURANCE INSTITUTE OF ISRAEL",
            "Date: February 15, 2026",
            "Subject: Medical Committee Appointment",
            "",
            "Dear Applicant,",
            "You are required to appear before the Medical Committee as follows:",
            "",
            "  Date:    March 5, 2026",
            "  Time:    10:00 AM",
            "  Place:   National Insurance Institute, Jerusalem Branch, Room 204",
            "  Address: 13 Weizmann Blvd, Jerusalem",
            "",
            "Please bring your ID card and all relevant medical records.",
            "For inquiries call: 02-6709000",
            "",
            "Failure to appear may result in your claim being processed with existing information.",
        ],
    },
    {
        "id": 4,
        "expected_trigger": "claim_rejected",
        "delay_before": 5,
        "file_name": "claim_rejection.pdf",
        "meta": {
            "date": "2026-02-17",
            "row_text": "Claim rejection - appeal rights attached",
            "index": 3,
            "category": "decisions",
            "title": "Rejection Decision",
        },
        "content": [
            "NATIONAL INSURANCE INSTITUTE OF ISRAEL",
            "Date: February 17, 2026",
            "Subject: Decision on Disability Claim - REJECTED",
            "",
            "Dear Applicant,",
            "After careful review by our medical committee, your disability claim",
            "has been REJECTED.",
            "",
            "Reason: Insufficient medical evidence to support a disability rating",
            "above the minimum threshold of 20%.",
            "",
            "You have the right to appeal this decision within 60 days of receiving",
            "this letter. For appeal procedures, contact your local NII branch.",
            "",
            "This decision is subject to appeal under Section 216 of the Insurance Law.",
            "",
            "National Insurance Institute - Medical Department",
        ],
    },
    {
        "id": 5,
        "expected_trigger": "rehab_approved",
        "delay_before": 5,
        "file_name": "rehab_approval.pdf",
        "meta": {
            "date": "2026-02-19",
            "row_text": "Vocational rehabilitation approved",
            "index": 4,
            "category": "rehabilitation",
            "title": "Rehabilitation Approval Letter",
        },
        "content": [
            "NATIONAL INSURANCE INSTITUTE OF ISRAEL - REHABILITATION DIVISION",
            "Date: February 19, 2026",
            "Subject: Approval of Vocational Rehabilitation",
            "",
            "Dear Applicant,",
            "We are pleased to notify you that your application for VOCATIONAL",
            "REHABILITATION has been APPROVED under Section 150 of the National",
            "Insurance Law.",
            "",
            "You are entitled to the following rehabilitation benefits:",
            "  - Full tuition funding for approved academic studies",
            "  - Monthly living allowance during the period of study",
            "  - Travel expense reimbursement",
            "  - Books and study equipment allowance",
            "",
            "Please contact your assigned rehabilitation officer to begin the process.",
            "Division: Rehabilitation Division, Tel-Aviv District",
        ],
    },
    {
        "id": 6,
        "expected_trigger": "form_pending",
        "delay_before": 5,
        "file_name": "form_270_request.pdf",
        "meta": {
            "date": "2026-02-21",
            "row_text": "Please complete and submit Form BL/270",
            "index": 5,
            "category": "forms",
            "title": "Form 270 Submission Request",
        },
        "content": [
            "NATIONAL INSURANCE INSTITUTE OF ISRAEL",
            "Date: February 21, 2026",
            "Subject: Required Form Submission - Form BL/270",
            "",
            "Dear Applicant,",
            "To continue processing your rehabilitation claim, you are required to",
            "complete and submit Form BL/270 - Application for Vocational Rehabilitation.",
            "",
            "The form must be completed in full and signed by the applicant.",
            "Obtain the form at any NII branch or download it from: www.btl.gov.il",
            "",
            "Please submit the completed form within 14 days of this notice.",
            "Reference: REH-2026-7823",
            "",
            "National Insurance Institute - Rehabilitation Department",
        ],
    },
    {
        "id": 7,
        "expected_trigger": "rehab_payment_update",
        "delay_before": 5,
        "file_name": "payment_breakdown.pdf",
        "meta": {
            "date": "2026-02-24",
            "row_text": "Rehabilitation payment amounts for 2026",
            "index": 6,
            "category": "payments",
            "title": "Payment Breakdown - Vocational Rehabilitation",
        },
        "content": [
            "NATIONAL INSURANCE INSTITUTE OF ISRAEL - PAYMENT SUMMARY",
            "Date: February 24, 2026",
            "Subject: Vocational Rehabilitation Payment Update",
            "",
            "The following payment amounts are approved for the 2026 academic year:",
            "",
            "  Living allowance:         3,200 ILS per month",
            "  Tuition reimbursement:    fully covered (up to 28,000 ILS / year)",
            "  Travel allowance:           400 ILS per month",
            "  Books & equipment:        1,500 ILS one-time",
            "",
            "  Total monthly benefit:    3,600 ILS",
            "",
            "Payment start date: March 1, 2026",
            "Payment method: Direct bank transfer",
            "Bank: Bank Hapoalim, Account ending in 4521",
            "",
            "National Insurance Institute - Finance Department",
        ],
    },
]


# ── Core sender ────────────────────────────────────────────────────────────────
def send_letter(letter: dict, case_id: str, user_id: str, base_url: str, dry_run: bool):
    pdf_bytes = make_pdf_bytes(letter["content"])
    b64 = base64.b64encode(pdf_bytes).decode("ascii")

    payload = {
        "file_name":   letter["file_name"],
        "file_type":   "application/pdf",
        "file_size":   len(pdf_bytes),
        "base64_data": b64,
        "meta":        letter["meta"],
    }
    if user_id:
        payload["user_id"] = user_id

    url = f"{base_url.rstrip('/')}/api/cases/{case_id}/letters/document"

    if dry_run:
        print(c(f"  [DRY RUN] Would POST → {url}", GREY))
        print(c(f"  Payload keys: {list(payload.keys())}", GREY))
        print(c(f"  PDF size: {len(pdf_bytes)} bytes  |  base64 len: {len(b64)}", GREY))
        return

    if _requests is None:
        print(c("  [ERROR] 'requests' package not installed. Run: pip install requests", RED))
        return

    try:
        resp = _requests.post(url, json=payload, timeout=120)
        data = {}
        try:
            data = resp.json()
        except Exception:
            data = {"raw": resp.text[:500]}

        if resp.status_code == 200:
            action = data.get("action") or {}
            at     = action.get("action_type") or "—"
            status = action.get("status_update") or "—"
            pct    = action.get("disability_percentage")
            amt    = action.get("monthly_amount")
            email  = action.get("registered_email")
            appt_d = action.get("appointment_date")
            appt_p = action.get("appointment_place")
            review = action.get("needs_human_review", False)

            print(c(f"  ✓ HTTP 200", GREEN))
            print(f"    action_type       : {c(at, CYAN)}")
            print(f"    status_update     : {c(status, CYAN)}")
            if pct is not None:
                print(f"    disability %%     : {c(str(pct) + '%', GREEN)}")
            if amt is not None:
                print(f"    monthly_amount    : {c('₪' + str(amt), GREEN)}")
            if email:
                print(f"    registered_email  : {c(email, GREEN)}")
            if appt_d:
                print(f"    appointment_date  : {c(appt_d, YELLOW)}")
            if appt_p:
                print(f"    appointment_place : {c(appt_p, YELLOW)}")
            if review:
                print(c(f"    ⚠  needs_human_review = true", YELLOW))

            expected = letter["expected_trigger"]
            if at == expected:
                print(c(f"    [PASS] trigger matched: {expected}", GREEN))
            else:
                print(c(f"    [MISMATCH] expected '{expected}', got '{at}'", YELLOW))

            doc_id = (data.get("document") or {}).get("id")
            if doc_id:
                print(f"    document_id : {c(doc_id, GREY)}")
        else:
            print(c(f"  ✗ HTTP {resp.status_code}", RED))
            print(c(f"    {json.dumps(data, ensure_ascii=False)[:400]}", RED))
    except Exception as exc:
        print(c(f"  ✗ Request failed: {exc}", RED))


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Simulate 7 BTL letters arriving for a case",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent(__doc__),
    )
    parser.add_argument("--case-id",  required=True, help="UUID of an existing case in the DB")
    parser.add_argument("--user-id",  default="",    help="UUID of the case owner (optional)")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Backend base URL")
    parser.add_argument("--delay",    type=int, default=5, help="Seconds between letters (default: 5)")
    parser.add_argument("--dry-run",  action="store_true", help="Print what would be sent without making requests")
    parser.add_argument("--only",     default="",    help="Comma-separated IDs to run, e.g. 1,3,5")
    args = parser.parse_args()

    only_ids = set()
    if args.only:
        try:
            only_ids = {int(x.strip()) for x in args.only.split(",") if x.strip()}
        except ValueError:
            print(c("[ERROR] --only must be comma-separated integers: e.g. --only 1,3,5", RED))
            sys.exit(1)

    letters_to_send = [l for l in LETTERS if (not only_ids or l["id"] in only_ids)]
    if not letters_to_send:
        print(c("[ERROR] No letters match the --only filter", RED))
        sys.exit(1)

    print()
    print(c("=" * 60, BOLD))
    print(c("  BTL Letter Pipeline Simulator", BOLD))
    print(c("=" * 60, BOLD))
    print(f"  case_id  : {c(args.case_id, CYAN)}")
    print(f"  user_id  : {c(args.user_id or '(from case)', GREY)}")
    print(f"  base_url : {c(args.base_url, GREY)}")
    print(f"  delay    : {c(str(args.delay) + 's between letters', GREY)}")
    print(f"  dry_run  : {c(str(args.dry_run), YELLOW if args.dry_run else GREY)}")
    print(f"  letters  : {c(str(len(letters_to_send)), CYAN)} of {len(LETTERS)}")
    print(c("=" * 60, BOLD))
    print()

    start = datetime.utcnow()
    for i, letter in enumerate(letters_to_send):
        delay = letter["delay_before"] if i == 0 else args.delay
        if delay > 0 and not args.dry_run:
            print(c(f"  ⏳ Waiting {delay}s before letter #{letter['id']}…", GREY))
            time.sleep(delay)

        print(c(f"\n── Letter {letter['id']}/7 : {letter['file_name']} ──", BOLD))
        print(f"   Expected trigger : {c(letter['expected_trigger'], YELLOW)}")
        print(f"   Letter date      : {c(letter['meta']['date'], GREY)}")
        print(f"   Description      : {c(letter['meta']['row_text'], GREY)}")

        send_letter(
            letter   = letter,
            case_id  = args.case_id,
            user_id  = args.user_id,
            base_url = args.base_url,
            dry_run  = args.dry_run,
        )

    elapsed = (datetime.utcnow() - start).total_seconds()
    print()
    print(c("=" * 60, BOLD))
    print(c(f"  Done. {len(letters_to_send)} letter(s) processed in {elapsed:.1f}s", GREEN))
    print(c("=" * 60, BOLD))
    print()


if __name__ == "__main__":
    main()
