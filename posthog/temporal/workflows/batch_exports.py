import json
import typing
from datetime import datetime
from string import Template

from posthog.models.element.element import chain_to_elements

SELECT_QUERY_TEMPLATE = Template(
    """
    SELECT $fields
    FROM events
    WHERE
        -- These 'timestamp' checks are a heuristic to exploit the sort key.
        -- Ideally, we need a schema that serves our needs, i.e. with a sort key on the _timestamp field used for batch exports.
        -- As a side-effect, this heuristic will discard historical loads older than 2 days.
        timestamp >= toDateTime({data_interval_start}, 'UTC') - INTERVAL 2 DAY
        AND timestamp < toDateTime({data_interval_end}, 'UTC') + INTERVAL 1 DAY
        AND COALESCE(inserted_at, _timestamp) >= toDateTime64({data_interval_start}, 6, 'UTC')
        AND COALESCE(inserted_at, _timestamp) < toDateTime64({data_interval_end}, 6, 'UTC')
        AND team_id = {team_id}
    $order_by
    $format
    """
)


async def get_rows_count(client, team_id: int, interval_start: str, interval_end: str) -> int:
    """Return the count of rows within interval bounds for a given team_id."""
    data_interval_start_ch = datetime.fromisoformat(interval_start).strftime("%Y-%m-%d %H:%M:%S")
    data_interval_end_ch = datetime.fromisoformat(interval_end).strftime("%Y-%m-%d %H:%M:%S")
    query = SELECT_QUERY_TEMPLATE.substitute(
        fields="count(DISTINCT event, cityHash64(distinct_id), cityHash64(uuid)) as count", order_by="", format=""
    )
    count = await client.read_query(
        query,
        query_parameters={
            "team_id": team_id,
            "data_interval_start": data_interval_start_ch,
            "data_interval_end": data_interval_end_ch,
        },
    )

    if count is None or len(count) == 0:
        raise ValueError("Unexpected result from ClickHouse: `None` returned for count query")

    return int(count)


FIELDS = """
DISTINCT ON (event, cityHash64(distinct_id), cityHash64(uuid))
toString(uuid) as uuid,
team_id,
timestamp,
inserted_at,
created_at,
event,
properties,
-- Point in time identity fields
toString(distinct_id) as distinct_id,
toString(person_id) as person_id,
person_properties,
-- Autocapture fields
elements_chain
"""


def get_results_iterator(
    client, team_id: int, interval_start: str, interval_end: str, legacy: bool = False
) -> typing.Generator[dict[str, typing.Any], None, None]:
    """Iterate over rows to export within interval bounds for a given team_id.

    Args:
        team_id: The ID for the Team whose rows we want to iterate over.
        interval_start: An isoformatted datetime representing the lower bound of the batch export.
        interval_end: An isoformatted datetime representing the upper bound of the batch export.
        legacy: Whether this batch export is using the legacy (export apps) schema.
    """
    data_interval_start_ch = datetime.fromisoformat(interval_start).strftime("%Y-%m-%d %H:%M:%S")
    data_interval_end_ch = datetime.fromisoformat(interval_end).strftime("%Y-%m-%d %H:%M:%S")
    query = SELECT_QUERY_TEMPLATE.substitute(
        fields=FIELDS,
        order_by="ORDER BY inserted_at",
        format="FORMAT ArrowStream",
    )

    for batch in client.stream_query_as_arrow(
        query,
        query_parameters={
            "team_id": team_id,
            "data_interval_start": data_interval_start_ch,
            "data_interval_end": data_interval_end_ch,
        },
    ):
        yield from iter_batch_records(batch, legacy=legacy)


def iter_batch_records(batch, legacy: bool = False) -> typing.Generator[dict[str, typing.Any], None, None]:
    """Iterate over records of a batch.

    The legacy parameter can be used to control whether the old schema is to be used, and by 'old' we
    mean the schema used by PostHog Export apps. It is hardcoded here to assist with migrating
    users over to BatchExports.

    Once support for custom schemas is added, the legacy parameter can be dropped in favor of a custom
    schema that can support the legacy schema used by PostHog Export apps. However, parsing the field
    "elements" may be a blocker for this, so the legacy parameter may be here longer than intended.

    Args:
        batch: The record batch of rows.
        legacy: Whether this batch export is using the legacy (export apps) schema.
    """

    for record in batch.to_pylist():
        properties = record.get("properties")
        person_properties = record.get("person_properties")
        properties = json.loads(properties) if properties else None

        if legacy is True:
            elements = []
            for element in chain_to_elements(record.get("elements_chain").decode()):
                element_dict = {
                    "text": element.text,
                    "tag_name": element.tag_name,
                    "href": element.href,
                    "attr_id": element.attr_id,
                    "attr_class": element.attr_class,
                    "nth_child": element.nth_child,
                    "nth_of_type": element.nth_of_type,
                    "attributes": element.attributes,
                    "event_id": element.event.id if element.event is not None else None,
                    "order": element.order,
                    "group_id": element.group.id if element.group is not None else None,
                }
                elements.append({k: v for k, v in element_dict.items() if v is not None})

            record = {
                "uuid": record.get("uuid").decode(),
                "event": record.get("event").decode(),
                "properties": properties,
                # I don't know why this is serialized as a string when stored in ClickHouse.
                # Should have been kept as "elements" in properties.
                # At least there is a function to parse it, although we need a dict not Django models.
                "elements": elements,
                "person_set": properties.get("$set", None) if properties else None,
                "person_set_once": properties.get("$set_once", None) if properties else None,
                "distinct_id": record.get("distinct_id").decode(),
                "team_id": record.get("team_id"),
                "ip": properties.get("$ip", None) if properties else None,
                "site_url": properties.get("$current_url", None) if properties else None,
                "timestamp": record.get("timestamp").strftime("%Y-%m-%d %H:%M:%S.%f"),
            }

        else:
            record = {
                "uuid": record.get("uuid").decode(),
                "distinct_id": record.get("distinct_id").decode(),
                "person_id": record.get("person_id").decode(),
                "event": record.get("event").decode(),
                "inserted_at": record.get("inserted_at").strftime("%Y-%m-%d %H:%M:%S.%f")
                if record.get("inserted_at")
                else None,
                "created_at": record.get("created_at").strftime("%Y-%m-%d %H:%M:%S.%f"),
                "timestamp": record.get("timestamp").strftime("%Y-%m-%d %H:%M:%S.%f"),
                "properties": properties,
                "person_properties": json.loads(person_properties) if person_properties else None,
                "elements_chain": record.get("elements_chain").decode(),
            }

        yield record
