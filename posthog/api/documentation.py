import re
from typing import Dict, get_args

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, extend_schema_field  # # noqa: F401 for easy import
from rest_framework import serializers

from posthog.models.entity import MATH_TYPE
from posthog.models.filters.mixins.property import PropertyMixin
from posthog.models.property import OperatorType, PropertyType


@extend_schema_field(OpenApiTypes.STR)
class ValueField(serializers.Field):
    def to_representation(self, value):
        return value

    def to_internal_value(self, data):
        return data


class PropertySerializer(serializers.Serializer):
    key = serializers.CharField(
        help_text="Key of the property you're filtering on. For example `email` or `$current_url`"
    )
    value = ValueField(
        help_text='Value of your filter. Can be an array. For example `test@example.com` or `https://example.com/test/`. Can be an array, like `["test@example.com","ok@example.com"]`'
    )
    operator = serializers.ChoiceField(
        choices=get_args(OperatorType), required=False, allow_blank=True, default="exact", allow_null=True
    )
    type = serializers.ChoiceField(choices=get_args(PropertyType), default="event", required=False, allow_blank=True)


class PropertiesSerializer(serializers.Serializer):
    properties = PropertySerializer(
        required=False, many=True, help_text="Filter events by event property, person property, cohort and more."
    )


class PropertyGroupField(serializers.Field):
    def to_representation(self, value):
        return value.to_dict()

    def to_internal_value(self, data):
        propertyParser = PropertyMixin()
        propertyParser._data = {}
        propertyParser._data["properties"] = data
        return propertyParser.property_groups


math_help_text = """How to aggregate results, shown as \"counted by\" in the interface.
- `total` (default): no aggregation, count by events
- `dau`: count by unique users. Despite the name, if you select the `interval` to be weekly or monthly, this will show weekly or monthly active users respectively
- `weekly_active`: rolling average of users of the last 7 days.
- `monthly_active`: rolling average of users of the last month.
- `unique_group`: count by group. Requires `math_group_type_index` to be sent. You can get the index by hitting `/api/projects/@current/groups_types/`.

All of the below are property aggregations, and require `math_property` to be sent with an event property.
- `sum`: sum of a numeric property.
- `min`: min of a numeric property.
- `max`: max of a numeric property.
- `median`: median of a numeric property.
- `p90`: 90th percentile of a numeric property.
- `p95` 95th percentile of a numeric property.
- `p99`: 99th percentile of a numeric property.
"""


class FilterEventSerializer(serializers.Serializer):
    id = serializers.CharField(help_text="Name of the event to filter on. For example `$pageview` or `user sign up`.")
    properties = PropertySerializer(many=True, required=False)
    math = serializers.ChoiceField(
        help_text=math_help_text, choices=get_args(MATH_TYPE), default="total", required=False
    )


class FilterActionSerializer(serializers.Serializer):
    id = serializers.CharField(help_text="ID of the action to filter on. For example `2841`.")
    properties = PropertySerializer(many=True, required=False)
    math = serializers.ChoiceField(
        help_text=math_help_text, choices=get_args(MATH_TYPE), default="total", required=False
    )


def preprocess_exclude_path_format(endpoints, **kwargs):
    """
    preprocessing hook that filters out {format} suffixed paths, in case
    format_suffix_patterns is used and {format} path params are unwanted.
    """
    result = []
    for path, path_regex, method, callback in endpoints:
        if hasattr(callback.cls, "legacy_team_compatibility") and callback.cls.legacy_team_compatibility:
            pass
        elif hasattr(callback.cls, "include_in_docs") and callback.cls.include_in_docs:
            path = path.replace("{parent_lookup_team_id}", "{project_id}")
            result.append((path, path_regex, method, callback))
    return result


def custom_postprocessing_hook(result, generator, request, public):
    all_tags = []
    paths: Dict[str, Dict] = {}
    for path, methods in result["paths"].items():
        paths[path] = {}
        for method, definition in methods.items():
            definition["tags"] = [d for d in definition["tags"] if d not in ["projects"]]
            match = re.search(r"((\/api\/(organizations|projects)/{(.*?)}\/)|(\/api\/))(?P<one>[a-zA-Z0-9-_]*)\/", path)
            if match:
                definition["tags"].append(match.group("one"))
            for tag in definition["tags"]:
                all_tags.append(tag)
            definition["operationId"] = (
                definition["operationId"].replace("organizations_", "", 1).replace("projects_", "", 1)
            )
            if "parameters" in definition:
                definition["parameters"] = [
                    {
                        "in": "path",
                        "name": "project_id",
                        "required": True,
                        "schema": {"type": "string"},
                        "description": "Project ID of the project you're trying to access. To find the ID of the project, make a call to /api/projects/.",
                    }
                    if param["name"] == "project_id"
                    else param
                    for param in definition["parameters"]
                ]
            paths[path][method] = definition
    return {
        **result,
        "info": {"title": "PostHog API", "version": None, "description": "",},
        "paths": paths,
        "x-tagGroups": [{"name": "All endpoints", "tags": sorted(list(set(all_tags)))},],
    }
