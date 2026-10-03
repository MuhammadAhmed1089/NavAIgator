"""
schema.py — Pydantic models mirroring schema/rule_record.schema.json exactly.
All fields match the hackathon grading schema. Do not rename fields.
"""

from typing import Optional, List, Union
from pydantic import BaseModel, Field
from enum import Enum


class JurisdictionLevel(str, Enum):
    STATE = "state"
    CITY = "city"


class RuleCategory(str, Enum):
    RENT_INCREASE_LIMITS = "rent_increase_limits"
    JUST_CAUSE_EVICTION = "just_cause_eviction"
    SECURITY_DEPOSITS = "security_deposits"
    APPLICATION_SCREENING_FEES = "application_screening_fees"
    SCREENING_RESTRICTIONS = "screening_restrictions"
    ALGORITHMIC_RENT_SETTING = "algorithmic_rent_setting"


class RuleStatus(str, Enum):
    IN_FORCE = "in_force"
    NOT_YET_EFFECTIVE = "not_yet_effective"
    PENDING = "pending"
    FAILED = "failed"


class RuleRecord(BaseModel):
    """
    One rule extracted from the corpus.
    Maps 1:1 to schema/rule_record.schema.json required by the hackathon graders.
    """
    team_rule_id: str = Field(..., description="Your unique id, e.g. 'r-0001'.")
    jurisdiction: str = Field(
        ...,
        description="State code ('CA','NJ','MA') or 'City, ST' (e.g. 'San Francisco, CA')."
    )
    level: JurisdictionLevel
    category: RuleCategory
    status: RuleStatus = Field(
        ...,
        description="As of the query date (default 2026-10-01). "
                    "Enacted laws with a future effective date are 'not_yet_effective'."
    )
    title: str
    requirement: str = Field(
        ...,
        description="One or two plain-language sentences describing the rule."
    )
    key_value: Optional[str] = Field(
        None,
        description="The headline number or formula, e.g. '1.5 months rent'."
    )
    coverage_conditions: Optional[Union[str, dict]] = Field(
        None,
        description="Who/what is covered: year built or certificate-of-occupancy cutoffs, unit counts, owner type."
    )
    exemptions: Optional[str] = None
    overrides: List[str] = Field(
        default_factory=list,
        description="team_rule_ids this rule supersedes or yields to."
    )
    interaction: Optional[str] = None
    effective_date: Optional[str] = Field(
        None,
        pattern=r"^\d{4}(-\d{2}(-\d{2})?)?$"
    )
    citation: str = Field(
        ...,
        description="Official cite, e.g. 'Cal. Civ. Code § 1947.12'."
    )
    source_doc_id: Optional[str] = Field(
        None,
        description="doc_id from corpus_manifest.csv."
    )
    source_url: str
    quoted_span: str = Field(
        ...,
        min_length=20,
        description="Exact text copied from the source document that supports the rule."
    )
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    conflict_flag: bool = False
    conflict_note: Optional[str] = None

    # Additional responsible AI fields not in schema but tracked internally
    retrieval_date: Optional[str] = Field(
        None,
        description="Date the source document was retrieved from the web. From corpus_manifest.csv."
    )
