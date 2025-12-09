<script setup lang="ts">
    /**
     * Shorthand of the reka-ui Tooltip. Also fix issue on mobile
     *
     *
     */
    import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip';
    import {ref} from 'vue';


    interface Props {
        tooltip: string;
        asChild?: boolean;
    }


    const props = withDefaults(defineProps<Props>(),{
        // asChild:false,
    });
    const tooltipIsOpen = ref(false);
</script>

<template>
    <Tooltip :open="tooltipIsOpen">
        <TooltipTrigger :as-child=props.asChild
            @focus="tooltipIsOpen = true"
            @blur="tooltipIsOpen = false"
            @mouseenter="tooltipIsOpen = true"
            @mouseleave="tooltipIsOpen = false"
        >
            <slot />
        </TooltipTrigger>
        <TooltipContent>
            {{ props.tooltip }}
        </TooltipContent>
    </Tooltip>

</template>
