"""Read printed policy identifiers/effective dates; never infer legal repeal."""
import datetime
import re


def policy_metadata(text):
    header = re.sub(r'\s+', ' ', text[:2600])
    identifier = re.search(r'Policy (?:Number|No\.?)\s*[:.]?\s*(AE\s*[-_]\s*\d{2})\b', header, re.I)
    date = re.search(r'Effective Date\s*[:.]?\s*(\d{1,2}[\s/-]+[A-Za-z]{3,9}[\s/-]+(?:19|20)\d{2})\b', header, re.I)
    legacy = re.search(r'Section\s*:\s*ACA\s*[-_]\s*ADM\b', header, re.I)
    legacy_number = re.search(r'Policy Number\s*[:.]?\s*(\d{1,2})\b', header, re.I) if legacy else None
    if (not identifier and not legacy_number) or not date:
        return {}
    value = re.sub(r'[\s/-]+', '-', date[1])
    parsed = None
    for fmt in ('%d-%b-%Y', '%d-%B-%Y'):
        try:
            parsed = datetime.datetime.strptime(value, fmt).date().isoformat()
            break
        except ValueError:
            pass
    return {'policyId': re.sub(r'\s+', '', identifier[1]).upper().replace('_', '-') if identifier else 'ACA-ADM-'+legacy_number[1].zfill(2),
            **({'policySeries': 'printed-legacy-ACA-ADM'} if legacy_number else {}),
            **({'policyEffectiveDate': parsed} if parsed else {})}
